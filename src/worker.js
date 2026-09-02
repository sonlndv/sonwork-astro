// sonwork.org — Cloudflare Worker.
// Serves the static site through env.ASSETS, guards it, and handles /api/* notes.
//
// Door, in order of precedence:
//   1. Cloudflare Access, when present: Cf-Access-Authenticated-User-Email is identity.
//   2. Otherwise a passphrase session cookie (SITE_PASSPHRASE + SESSION_SECRET),
//      which identifies the visitor as OWNER_EMAIL. Single-owner mode.
//   3. Nothing → /login for pages, 401 for the API.
// Public: /p/*, built assets, favicon, robots, and the login page itself.
//
// Notes live in KV, one key per document, plus an index for counts and export.

const DOC = 'doc:';
const INDEX = 'index';
const MAX_TEXT = 4000;
const MAX_PER_DOC = 500;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,120}$/;
const ANCHOR_RE = /^[a-z0-9][a-z0-9-]{0,160}$/;
const COOKIE = 'sw_session';
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/login') return login(request, env, url);
    if (p === '/logout') return redirect('/login', { 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });

    if (p.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (e) { return json({ error: 'internal', detail: String(e?.message || e) }, 500); }
    }

    if (isPublic(p)) return env.ASSETS.fetch(request);
    const me = await identity(request, env);
    if (!me) return redirect('/login?next=' + encodeURIComponent(p + url.search));
    return env.ASSETS.fetch(request);
  },
};

function isPublic(p) {
  return p.startsWith('/p/') || p.startsWith('/_astro/') || p === '/favicon.svg' || p === '/robots.txt';
}

// -------------------- identity --------------------

async function identity(request, env) {
  const access = request.headers.get('cf-access-authenticated-user-email');
  if (access) return access.trim().toLowerCase();
  if (await validSession(request, env)) return String(env.OWNER_EMAIL || 'owner').toLowerCase();
  if (env.DEV_EMAIL) return String(env.DEV_EMAIL).toLowerCase();
  return null;
}

function allowed(email, env) {
  const list = String(env.ALLOWED_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email);
}

// -------------------- passphrase session --------------------

async function hmac(env, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(env.SESSION_SECRET || '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function equal(env, a, b) {
  // Compare digests, not strings, so length and timing leak nothing useful.
  return (await hmac(env, 'cmp:' + a)) === (await hmac(env, 'cmp:' + b));
}
function cookieOf(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? m[1] : null;
}
async function validSession(request, env) {
  if (!env.SESSION_SECRET) return false;
  const c = cookieOf(request); if (!c) return false;
  const [exp, sig] = c.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return (await hmac(env, exp)) === sig;
}
async function login(request, env, url) {
  const next = safeNext(url.searchParams.get('next'));
  if (!env.SITE_PASSPHRASE || !env.SESSION_SECRET) return page('Door not configured', 'Set SITE_PASSPHRASE and SESSION_SECRET with wrangler secret put.', '', next, 503);
  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const pass = String(form?.get('passphrase') || '');
    if (pass && (await equal(env, pass, env.SITE_PASSPHRASE))) {
      const exp = String(Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400);
      const cookie = `${COOKIE}=${exp}.${await hmac(env, exp)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
      return redirect(next, { 'set-cookie': cookie });
    }
    return page('Not it.', 'That passphrase did not match.', 'error', next, 401);
  }
  if (await validSession(request, env)) return redirect(next);
  return page('sonwork', 'Private. Enter the passphrase.', '', next, 200);
}
function safeNext(n) { return n && n.startsWith('/') && !n.startsWith('//') ? n : '/'; }
function redirect(to, headers = {}) { return new Response(null, { status: 302, headers: { location: to, ...headers } }); }
function page(title, msg, cls, next, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} — Sơn Lê</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:oklch(0.115 0.022 256);color:oklch(0.965 0.006 250);font:16px/1.6 Sora,system-ui,sans-serif}
form{width:min(360px,90vw)}h1{font-weight:600;letter-spacing:-.04em;font-size:28px;margin:0 0 6px;display:flex;align-items:center;gap:10px}h1::before{content:"";width:9px;height:9px;border-radius:2px;background:oklch(0.800 0.135 222);box-shadow:0 0 12px oklch(0.800 0.135 222/.7)}
p{margin:0 0 22px;color:oklch(0.560 0.020 252);font-weight:300}p.error{color:oklch(0.820 0.095 55)}
input{width:100%;box-sizing:border-box;font:inherit;color:inherit;background:oklch(0.150 0.026 255);border:1px solid oklch(0.290 0.030 254);border-radius:6px;padding:11px 12px;margin-bottom:10px}input:focus{outline:none;border-color:oklch(0.800 0.135 222)}
button{font:inherit;font-weight:600;color:oklch(0.115 0.022 256);background:oklch(0.800 0.135 222);border:0;border-radius:6px;padding:10px 16px;cursor:pointer}</style></head>
<body><form method="post" action="/login?next=${encodeURIComponent(next)}"><h1>${title}</h1><p class="${cls}">${msg}</p><input type="password" name="passphrase" autocomplete="current-password" autofocus required><button type="submit">Enter</button></form></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// -------------------- KV --------------------

async function readDoc(env, slug) { const raw = await env.COMMENTS.get(DOC + slug); return raw ? JSON.parse(raw) : { slug, comments: [] }; }
async function writeDoc(env, doc) { await env.COMMENTS.put(DOC + doc.slug, JSON.stringify(doc)); }
async function readIndex(env) { const raw = await env.COMMENTS.get(INDEX); return raw ? JSON.parse(raw) : { counts: {}, updatedAt: null }; }
async function writeIndex(env, slug, count) {
  const idx = await readIndex(env);
  if (count > 0) idx.counts[slug] = count; else delete idx.counts[slug];
  idx.updatedAt = new Date().toISOString();
  await env.COMMENTS.put(INDEX, JSON.stringify(idx));
}

// -------------------- API --------------------

async function api(request, env, url) {
  const p = url.pathname, m = request.method;
  const me = await identity(request, env);
  if (!me) return json({ error: 'unauthenticated' }, 401);

  if (p === '/api/me' && m === 'GET') return json({ email: me, canWrite: allowed(me, env) });

  if (p === '/api/comments/summary' && m === 'GET') return json(await readIndex(env), 200, { 'cache-control': 'no-store' });

  if (p === '/api/comments/export' && m === 'GET') {
    const idx = await readIndex(env);
    const parts = [`# Notes from Sơn\n\nExported ${new Date().toISOString()}\n`];
    for (const slug of Object.keys(idx.counts).sort()) {
      const doc = await readDoc(env, slug);
      if (!doc.comments.length) continue;
      parts.push(`\n## /reports/${slug}/\n`);
      for (const c of doc.comments) parts.push(`- **${c.anchor === 'top' ? 'whole document' : '#' + c.anchor}** · ${c.createdAt}\n  ${c.text.replace(/\n/g, '\n  ')}\n`);
    }
    return new Response(parts.join('\n'), { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } });
  }

  if (p === '/api/comments' && m === 'GET') {
    const slug = url.searchParams.get('doc') || '';
    if (!SLUG_RE.test(slug)) return json({ error: 'bad doc' }, 400);
    return json({ ...(await readDoc(env, slug)), canWrite: allowed(me, env) }, 200, { 'cache-control': 'no-store' });
  }

  if (p === '/api/comments' && m === 'POST') {
    if (!allowed(me, env)) return json({ error: 'forbidden' }, 403);
    const body = await request.json().catch(() => null);
    const slug = String(body?.doc || ''), anchor = String(body?.anchor || 'top'), text = String(body?.text || '').trim();
    if (!SLUG_RE.test(slug)) return json({ error: 'bad doc' }, 400);
    if (!ANCHOR_RE.test(anchor)) return json({ error: 'bad anchor' }, 400);
    if (!text) return json({ error: 'empty' }, 400);
    if (text.length > MAX_TEXT) return json({ error: `too long (max ${MAX_TEXT})` }, 413);
    const doc = await readDoc(env, slug);
    if (doc.comments.length >= MAX_PER_DOC) return json({ error: 'document is full' }, 429);
    const now = new Date().toISOString();
    const comment = { id: crypto.randomUUID(), anchor, text, author: me, createdAt: now, updatedAt: now };
    doc.comments.push(comment);
    await writeDoc(env, doc); await writeIndex(env, slug, doc.comments.length);
    return json({ comment }, 201);
  }

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
    if (m === 'DELETE') doc.comments.splice(i, 1);
    else {
      if (Date.now() - Date.parse(c.createdAt) > EDIT_WINDOW_MS) return json({ error: 'edit window closed; add a new note' }, 403);
      const body = await request.json().catch(() => null);
      const text = String(body?.text || '').trim();
      if (!text || text.length > MAX_TEXT) return json({ error: 'bad text' }, 400);
      c.text = text; c.updatedAt = new Date().toISOString();
    }
    await writeDoc(env, doc); await writeIndex(env, slug, doc.comments.length);
    return json(m === 'DELETE' ? { ok: true } : { comment: c });
  }
  return json({ error: 'not found' }, 404);
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });
}
