// sonwork.org — Cloudflare Worker.
// Serves the static site through env.ASSETS and handles /api/* for Sơn's notes.
//
// Notes are the only human voice on the site. They live in KV, one key per
// document, plus a single index key that carries counts for list pages and
// the export that agents read back into gbrain.
//
// Identity comes from Cloudflare Access (Cf-Access-Authenticated-User-Email).
// For local `wrangler dev`, pass --var DEV_EMAIL:you@example.com.

const DOC = 'doc:';
const INDEX = 'index';
const MAX_TEXT = 4000;
const MAX_PER_DOC = 500;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,120}$/;
const ANCHOR_RE = /^[a-z0-9][a-z0-9-]{0,160}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await api(request, env, url);
      } catch (e) {
        return json({ error: 'internal', detail: String(e?.message || e) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

// -------------------- identity --------------------

function identity(request, env) {
  const email = request.headers.get('cf-access-authenticated-user-email') || env.DEV_EMAIL || null;
  return email ? email.trim().toLowerCase() : null;
}

function allowed(email, env) {
  const list = String(env.ALLOWED_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email);
}

// -------------------- KV --------------------

async function readDoc(env, slug) {
  const raw = await env.COMMENTS.get(DOC + slug);
  return raw ? JSON.parse(raw) : { slug, comments: [] };
}
async function writeDoc(env, doc) {
  await env.COMMENTS.put(DOC + doc.slug, JSON.stringify(doc));
}
async function readIndex(env) {
  const raw = await env.COMMENTS.get(INDEX);
  return raw ? JSON.parse(raw) : { counts: {}, updatedAt: null };
}
async function writeIndex(env, slug, count) {
  const idx = await readIndex(env);
  if (count > 0) idx.counts[slug] = count; else delete idx.counts[slug];
  idx.updatedAt = new Date().toISOString();
  await env.COMMENTS.put(INDEX, JSON.stringify(idx));
}

// -------------------- routes --------------------

async function api(request, env, url) {
  const p = url.pathname;
  const m = request.method;
  const me = identity(request, env);

  // Everything behind Access is already authenticated; without an identity
  // there is nothing to show, and nothing to write.
  if (!me) return json({ error: 'unauthenticated' }, 401);

  if (p === '/api/me' && m === 'GET') {
    return json({ email: me, canWrite: allowed(me, env) });
  }

  if (p === '/api/comments/summary' && m === 'GET') {
    const idx = await readIndex(env);
    return json(idx, 200, { 'cache-control': 'no-store' });
  }

  if (p === '/api/comments/export' && m === 'GET') {
    // Every note, as markdown, for an agent to absorb into gbrain.
    const idx = await readIndex(env);
    const slugs = Object.keys(idx.counts).sort();
    const parts = [`# Notes from Sơn\n\nExported ${new Date().toISOString()}\n`];
    for (const slug of slugs) {
      const doc = await readDoc(env, slug);
      if (!doc.comments.length) continue;
      parts.push(`\n## /reports/${slug}/\n`);
      for (const c of doc.comments) {
        parts.push(`- **${c.anchor === 'top' ? 'whole document' : '#' + c.anchor}** · ${c.createdAt}\n  ${c.text.replace(/\n/g, '\n  ')}\n`);
      }
    }
    return new Response(parts.join('\n'), {
      headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (p === '/api/comments' && m === 'GET') {
    const slug = url.searchParams.get('doc') || '';
    if (!SLUG_RE.test(slug)) return json({ error: 'bad doc' }, 400);
    const doc = await readDoc(env, slug);
    return json({ ...doc, canWrite: allowed(me, env) }, 200, { 'cache-control': 'no-store' });
  }

  if (p === '/api/comments' && m === 'POST') {
    if (!allowed(me, env)) return json({ error: 'forbidden' }, 403);
    const body = await request.json().catch(() => null);
    const slug = String(body?.doc || '');
    const anchor = String(body?.anchor || 'top');
    const text = String(body?.text || '').trim();
    if (!SLUG_RE.test(slug)) return json({ error: 'bad doc' }, 400);
    if (!ANCHOR_RE.test(anchor)) return json({ error: 'bad anchor' }, 400);
    if (!text) return json({ error: 'empty' }, 400);
    if (text.length > MAX_TEXT) return json({ error: `too long (max ${MAX_TEXT})` }, 413);

    const doc = await readDoc(env, slug);
    if (doc.comments.length >= MAX_PER_DOC) return json({ error: 'document is full' }, 429);
    const now = new Date().toISOString();
    const comment = { id: crypto.randomUUID(), anchor, text, author: me, createdAt: now, updatedAt: now };
    doc.comments.push(comment);
    await writeDoc(env, doc);
    await writeIndex(env, slug, doc.comments.length);
    return json({ comment }, 201);
  }

  // /api/comments/:id?doc=slug
  const one = p.match(/^\/api\/comments\/([0-9a-f-]{36})$/);
  if (one && (m === 'DELETE' || m === 'PATCH')) {
    if (!allowed(me, env)) return json({ error: 'forbidden' }, 403);
    const slug = url.searchParams.get('doc') || '';
    if (!SLUG_RE.test(slug)) return json({ error: 'bad doc' }, 400);
    const doc = await readDoc(env, slug);
    const i = doc.comments.findIndex((c) => c.id === one[1]);
    if (i < 0) return json({ error: 'not found' }, 404);
    const c = doc.comments[i];
    if (c.author !== me) return json({ error: 'not yours' }, 403);

    if (m === 'DELETE') {
      doc.comments.splice(i, 1);
    } else {
      if (Date.now() - Date.parse(c.createdAt) > EDIT_WINDOW_MS) return json({ error: 'edit window closed; add a new note' }, 403);
      const body = await request.json().catch(() => null);
      const text = String(body?.text || '').trim();
      if (!text || text.length > MAX_TEXT) return json({ error: 'bad text' }, 400);
      c.text = text; c.updatedAt = new Date().toISOString();
    }
    await writeDoc(env, doc);
    await writeIndex(env, slug, doc.comments.length);
    return json(m === 'DELETE' ? { ok: true } : { comment: c });
  }

  return json({ error: 'not found' }, 404);
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}
