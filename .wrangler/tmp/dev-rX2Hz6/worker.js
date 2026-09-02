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
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await api(request, env, url);
      } catch (e) {
        return json({ error: "internal", detail: String(e?.message || e) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
function identity(request, env) {
  const email = request.headers.get("cf-access-authenticated-user-email") || env.DEV_EMAIL || null;
  return email ? email.trim().toLowerCase() : null;
}
__name(identity, "identity");
function allowed(email, env) {
  const list = String(env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email);
}
__name(allowed, "allowed");
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
  const p = url.pathname;
  const m = request.method;
  const me = identity(request, env);
  if (!me) return json({ error: "unauthenticated" }, 401);
  if (p === "/api/me" && m === "GET") {
    return json({ email: me, canWrite: allowed(me, env) });
  }
  if (p === "/api/comments/summary" && m === "GET") {
    const idx = await readIndex(env);
    return json(idx, 200, { "cache-control": "no-store" });
  }
  if (p === "/api/comments/export" && m === "GET") {
    const idx = await readIndex(env);
    const slugs = Object.keys(idx.counts).sort();
    const parts = [`# Notes from S\u01A1n

Exported ${(/* @__PURE__ */ new Date()).toISOString()}
`];
    for (const slug of slugs) {
      const doc = await readDoc(env, slug);
      if (!doc.comments.length) continue;
      parts.push(`
## /reports/${slug}/
`);
      for (const c of doc.comments) {
        parts.push(`- **${c.anchor === "top" ? "whole document" : "#" + c.anchor}** \xB7 ${c.createdAt}
  ${c.text.replace(/\n/g, "\n  ")}
`);
      }
    }
    return new Response(parts.join("\n"), {
      headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" }
    });
  }
  if (p === "/api/comments" && m === "GET") {
    const slug = url.searchParams.get("doc") || "";
    if (!SLUG_RE.test(slug)) return json({ error: "bad doc" }, 400);
    const doc = await readDoc(env, slug);
    return json({ ...doc, canWrite: allowed(me, env) }, 200, { "cache-control": "no-store" });
  }
  if (p === "/api/comments" && m === "POST") {
    if (!allowed(me, env)) return json({ error: "forbidden" }, 403);
    const body = await request.json().catch(() => null);
    const slug = String(body?.doc || "");
    const anchor = String(body?.anchor || "top");
    const text = String(body?.text || "").trim();
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
    if (!allowed(me, env)) return json({ error: "forbidden" }, 403);
    const slug = url.searchParams.get("doc") || "";
    if (!SLUG_RE.test(slug)) return json({ error: "bad doc" }, 400);
    const doc = await readDoc(env, slug);
    const i = doc.comments.findIndex((c2) => c2.id === one[1]);
    if (i < 0) return json({ error: "not found" }, 404);
    const c = doc.comments[i];
    if (c.author !== me) return json({ error: "not yours" }, 403);
    if (m === "DELETE") {
      doc.comments.splice(i, 1);
    } else {
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
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra }
  });
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

// .wrangler/tmp/bundle-B00EmO/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-B00EmO/middleware-loader.entry.ts
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
