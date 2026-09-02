var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var DOC = "doc:";
var INDEX = "index";
var MAX_TEXT = 4e3;
var MAX_PER_DOC = 500;
var EDIT_WINDOW_MS = 24 * 60 * 60 * 1e3;
var SLUG_RE = /^[a-z0-9][a-z0-9-]{1,120}$/;
var ANCHOR_RE = /^[a-z0-9][a-z0-9-]{0,160}$/;
var COOKIE = "sw_session";
var SESSION_DAYS = 30;
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p.startsWith("/reports/")) return redirect("/readings/" + p.slice(9) + url.search, {}, 301);
    if (p === "/login") return login(request, env, url);
    if (p === "/logout") return redirect("/login", { "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
    if (p === "/api/file" && request.method === "POST") {
      try {
        return await fileReading(request, env);
      } catch (e) {
        return json({ error: "internal", detail: String(e?.message || e) }, 500);
      }
    }
    if (p.startsWith("/api/")) {
      try {
        return await api(request, env, url);
      } catch (e) {
        return json({ error: "internal", detail: String(e?.message || e) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
async function identity(request, env) {
  const access = request.headers.get("cf-access-authenticated-user-email");
  if (access) return access.trim().toLowerCase();
  if (await validSession(request, env)) return String(env.OWNER_EMAIL || "owner").toLowerCase();
  if (env.DEV_EMAIL) return String(env.DEV_EMAIL).toLowerCase();
  return null;
}
__name(identity, "identity");
function allowed(email, env) {
  const list = String(env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email);
}
__name(allowed, "allowed");
async function hmac(env, data) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.SESSION_SECRET || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmac, "hmac");
async function equal(env, a, b) {
  return await hmac(env, "cmp:" + a) === await hmac(env, "cmp:" + b);
}
__name(equal, "equal");
function cookieOf(request) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  return m ? m[1] : null;
}
__name(cookieOf, "cookieOf");
async function validSession(request, env) {
  if (!env.SESSION_SECRET) return false;
  const c = cookieOf(request);
  if (!c) return false;
  const [exp, sig] = c.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1e3) return false;
  return await hmac(env, exp) === sig;
}
__name(validSession, "validSession");
async function login(request, env, url) {
  const next = safeNext(url.searchParams.get("next"));
  if (!env.SITE_PASSPHRASE || !env.SESSION_SECRET) return page("Door not configured", "Set SITE_PASSPHRASE and SESSION_SECRET with wrangler secret put.", "", next, 503);
  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const pass = String(form?.get("passphrase") || "");
    if (pass && await equal(env, pass, env.SITE_PASSPHRASE)) {
      const exp = String(Math.floor(Date.now() / 1e3) + SESSION_DAYS * 86400);
      const cookie = `${COOKIE}=${exp}.${await hmac(env, exp)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
      return redirect(next, { "set-cookie": cookie });
    }
    return page("Not it.", "That passphrase did not match.", "error", next, 401);
  }
  if (await validSession(request, env)) return redirect(next);
  return page("sonwork", "Private. Enter the passphrase.", "", next, 200);
}
__name(login, "login");
function safeNext(n) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}
__name(safeNext, "safeNext");
function redirect(to, headers = {}, status = 302) {
  return new Response(null, { status, headers: { location: to, ...headers } });
}
__name(redirect, "redirect");
function page(title, msg, cls, next, status) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} \u2014 S\u01A1n L\xEA</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:oklch(0.115 0.022 256);color:oklch(0.965 0.006 250);font:16px/1.6 Sora,system-ui,sans-serif}
form{width:min(360px,90vw)}h1{font-weight:600;letter-spacing:-.04em;font-size:28px;margin:0 0 6px;display:flex;align-items:center;gap:10px}h1::before{content:"";width:9px;height:9px;border-radius:2px;background:oklch(0.800 0.135 222);box-shadow:0 0 12px oklch(0.800 0.135 222/.7)}
p{margin:0 0 22px;color:oklch(0.560 0.020 252);font-weight:300}p.error{color:oklch(0.820 0.095 55)}
input{width:100%;box-sizing:border-box;font:inherit;color:inherit;background:oklch(0.150 0.026 255);border:1px solid oklch(0.290 0.030 254);border-radius:6px;padding:11px 12px;margin-bottom:10px}input:focus{outline:none;border-color:oklch(0.800 0.135 222)}
button{font:inherit;font-weight:600;color:oklch(0.115 0.022 256);background:oklch(0.800 0.135 222);border:0;border-radius:6px;padding:10px 16px;cursor:pointer}</style></head>
<body><form method="post" action="/login?next=${encodeURIComponent(next)}"><h1>${title}</h1><p class="${cls}">${msg}</p><input type="password" name="passphrase" autocomplete="current-password" autofocus required><button type="submit">Enter</button></form></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
__name(page, "page");
var KINDS = ["news", "breakdown", "research", "model", "analysis", "technical"];
var REPO = "sonlndv/sonwork-astro";
var FORBIDDEN = /\bwecare\b/i;
function slugify(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
__name(slugify, "slugify");
async function filingAuth(request, env) {
  const h = request.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!env.FILING_TOKEN || !t) return false;
  return await hmac(env, "file:" + t) === await hmac(env, "file:" + env.FILING_TOKEN);
}
__name(filingAuth, "filingAuth");
async function fileReading(request, env) {
  if (!await filingAuth(request, env)) return json({ error: "unauthenticated", hint: "Authorization: Bearer <FILING_TOKEN>" }, 401);
  const b = await request.json().catch(() => null);
  if (!b) return json({ error: "body must be JSON" }, 400);
  const errs = [];
  const title = String(b.title || "").trim();
  if (title.length < 4) errs.push("title: at least 4 characters");
  const dek = String(b.dek || "").trim();
  if (dek.length < 10 || dek.length > 400) errs.push("dek: 10-400 characters");
  const type = String(b.type || "").trim();
  if (!KINDS.includes(type)) errs.push("type: one of " + KINDS.join("|"));
  const author = String(b.author || "").trim();
  if (!author) errs.push("author: required (your own agent name)");
  const lang = b.lang ? String(b.lang) : "en";
  if (!["en", "vi"].includes(lang)) errs.push("lang: en|vi");
  const revision = b.revision == null ? 1 : Number(b.revision);
  if (!Number.isInteger(revision) || revision < 1) errs.push("revision: positive integer");
  const date = b.date ? String(b.date) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) errs.push("date: YYYY-MM-DD");
  const body = String(b.body || "").trim();
  if (body.length < 40) errs.push("body: at least 40 characters of markdown");
  const sources = Array.isArray(b.sources) ? b.sources.map(String) : [];
  for (const s of sources) {
    try {
      new URL(s);
    } catch {
      errs.push("sources: not a URL: " + s);
    }
  }
  const tags = Array.isArray(b.tags) ? b.tags.map(String) : [];
  const slug = slugify(b.slug || title);
  if (!slug) errs.push("slug: could not derive one from the title");
  if (FORBIDDEN.test(title + " " + dek + " " + body)) errs.push("content: WeCare material is not allowed on this site");
  if (errs.length) return json({ error: "invalid", problems: errs }, 422);
  if (!env.GITHUB_TOKEN) return json({ error: "filing not configured", hint: "set GITHUB_TOKEN on the Worker", wouldFile: `src/content/reports/${date}-${slug}.md` }, 503);
  const y = /* @__PURE__ */ __name((s) => JSON.stringify(s), "y");
  const fm = ["---", `title: ${y(title)}`, `dek: ${y(dek)}`, `date: ${date}`, `type: ${type}`, `author: ${y(author)}`, `lang: ${lang}`, `revision: ${revision}`];
  if (sources.length) fm.push("sources:", ...sources.map((s) => "  - " + y(s)));
  if (tags.length) fm.push("tags: [" + tags.map((t) => y(t)).join(", ") + "]");
  fm.push("---", "", body, "");
  const md = fm.join("\n");
  const path = `src/content/reports/${date}-${slug}.md`;
  const api2 = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const gh = { authorization: "Bearer " + env.GITHUB_TOKEN, "user-agent": "sonwork-filing", accept: "application/vnd.github+json" };
  const existing = await fetch(api2, { headers: gh });
  const sha = existing.ok ? (await existing.json()).sha : void 0;
  if (sha && revision < 2) return json({ error: "exists", hint: "this slug already exists; send revision >= 2 to revise it, or a different slug" }, 409);
  const message = (sha ? "reading: revise " : "reading: ") + title + " (" + author + ")";
  const put = await fetch(api2, {
    method: "PUT",
    headers: { ...gh, "content-type": "application/json" },
    body: JSON.stringify({ message, content: btoa(unescape(encodeURIComponent(md))), sha, committer: { name: author, email: "agents@sonwork.org" } })
  });
  const res = await put.json().catch(() => ({}));
  if (!put.ok) return json({ error: "github", status: put.status, detail: res.message || res }, 502);
  return json({
    ok: true,
    path,
    url: `https://sonwork.org/readings/${date}-${slug}/`,
    commit: res.commit?.sha,
    revised: !!sha,
    note: "Deploys within a few minutes. Revise by posting the same slug with a higher revision."
  }, sha ? 200 : 201);
}
__name(fileReading, "fileReading");
async function readDoc(env, slug) {
  const raw = await env.COMMENTS.get(DOC + slug);
  return raw ? JSON.parse(raw) : { slug, comments: [] };
}
__name(readDoc, "readDoc");
async function writeDoc(env, doc) {
  await env.COMMENTS.put(DOC + doc.slug, JSON.stringify(doc));
}
__name(writeDoc, "writeDoc");
async function readIndex(env) {
  const raw = await env.COMMENTS.get(INDEX);
  return raw ? JSON.parse(raw) : { counts: {}, updatedAt: null };
}
__name(readIndex, "readIndex");
async function writeIndex(env, slug, count) {
  const idx = await readIndex(env);
  if (count > 0) idx.counts[slug] = count;
  else delete idx.counts[slug];
  idx.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await env.COMMENTS.put(INDEX, JSON.stringify(idx));
}
__name(writeIndex, "writeIndex");
async function api(request, env, url) {
  const p = url.pathname, m = request.method;
  const me = await identity(request, env);
  const canWrite = allowed(me, env);
  if (p === "/api/me" && m === "GET") return json({ email: me, canWrite });
  if (p === "/api/comments/summary" && m === "GET") return json(await readIndex(env), 200, { "cache-control": "no-store" });
  if (p === "/api/comments/export" && m === "GET") {
    const idx = await readIndex(env);
    const parts = [`# Notes from S\u01A1n

Exported ${(/* @__PURE__ */ new Date()).toISOString()}
`];
    for (const slug of Object.keys(idx.counts).sort()) {
      const doc = await readDoc(env, slug);
      if (!doc.comments.length) continue;
      parts.push(`
## /readings/${slug}/
`);
      for (const c of doc.comments) parts.push(`- **${c.anchor === "top" ? "whole document" : "#" + c.anchor}** \xB7 ${c.createdAt}
  ${c.text.replace(/\n/g, "\n  ")}
`);
    }
    return new Response(parts.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" } });
  }
  if (p === "/api/comments" && m === "GET") {
    const slug = url.searchParams.get("doc") || "";
    if (!SLUG_RE.test(slug)) return json({ error: "bad doc" }, 400);
    return json({ ...await readDoc(env, slug), canWrite }, 200, { "cache-control": "no-store" });
  }
  if (p === "/api/comments" && m === "POST") {
    if (!me) return json({ error: "unauthenticated" }, 401);
    if (!canWrite) return json({ error: "forbidden" }, 403);
    const body = await request.json().catch(() => null);
    const slug = String(body?.doc || ""), anchor = String(body?.anchor || "top"), text = String(body?.text || "").trim();
    if (!SLUG_RE.test(slug)) return json({ error: "bad doc" }, 400);
    if (!ANCHOR_RE.test(anchor)) return json({ error: "bad anchor" }, 400);
    if (!text) return json({ error: "empty" }, 400);
    if (text.length > MAX_TEXT) return json({ error: `too long (max ${MAX_TEXT})` }, 413);
    const doc = await readDoc(env, slug);
    if (doc.comments.length >= MAX_PER_DOC) return json({ error: "document is full" }, 429);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const comment = { id: crypto.randomUUID(), anchor, text, author: me, createdAt: now, updatedAt: now };
    doc.comments.push(comment);
    await writeDoc(env, doc);
    await writeIndex(env, slug, doc.comments.length);
    return json({ comment }, 201);
  }
  const one = p.match(/^\/api\/comments\/([0-9a-f-]{36})$/);
  if (one && (m === "DELETE" || m === "PATCH")) {
    if (!me) return json({ error: "unauthenticated" }, 401);
    if (!canWrite) return json({ error: "forbidden" }, 403);
    const slug = url.searchParams.get("doc") || "";
    if (!SLUG_RE.test(slug)) return json({ error: "bad doc" }, 400);
    const doc = await readDoc(env, slug);
    const i = doc.comments.findIndex((c2) => c2.id === one[1]);
    if (i < 0) return json({ error: "not found" }, 404);
    const c = doc.comments[i];
    if (c.author !== me) return json({ error: "not yours" }, 403);
    if (m === "DELETE") doc.comments.splice(i, 1);
    else {
      if (Date.now() - Date.parse(c.createdAt) > EDIT_WINDOW_MS) return json({ error: "edit window closed; add a new note" }, 403);
      const body = await request.json().catch(() => null);
      const text = String(body?.text || "").trim();
      if (!text || text.length > MAX_TEXT) return json({ error: "bad text" }, 400);
      c.text = text;
      c.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    await writeDoc(env, doc);
    await writeIndex(env, slug, doc.comments.length);
    return json(m === "DELETE" ? { ok: true } : { comment: c });
  }
  return json({ error: "not found" }, 404);
}
__name(api, "api");
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });
}
__name(json, "json");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-UTLGWR/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-UTLGWR/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
