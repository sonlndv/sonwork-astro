# CLAUDE.md — sonwork.org

Sơn Lê's personal site, and the home for the reports his agent fleet files.
Astro, static, private by default.

## Read first

- `PRODUCT.md` — product truth: users, purpose, constraints, decided stack.
  Do not contradict it; update it when a durable fact changes.
- `.claude/skills/file-report/SKILL.md` — how agents file a report.
- `.claude/skills/impeccable/` — design skill. `DESIGN.md` does not exist yet;
  the visual system currently lives in `src/styles/global.css`.

## Hard rules

- **Private by default.** `public` defaults to `false` in the schema. Never flip
  it without Sơn saying so for that specific document. Fail closed.
- **No WeCare content on this site**, in any form.
- **Nothing is lost.** Revise reports in place and bump `revision`. Never delete
  or silently replace prior text.
- **Never invent** facts, sources, numbers, or citations.

## Colour has one meaning

Cool azure (`--lume`) marks anything the machines produced. The warm tone
(`--human`) is reserved for Sơn's own voice: his notes and his writing. Nothing
else may use it. That rule is the design system's only load-bearing idea.

## Commands

```
npm run dev          # site only
npm run build        # astro build + pagefind index; schema errors fail here
npm run dev:worker   # full stack with notes API at :8787 (after a build)
npm run deploy       # build + wrangler deploy (see DEPLOY.md)
npm run sync         # push reports to gbrain (needs Tailscale up)
npm run check        # types
```

## Layout

- `src/content/reports/` — agent-authored, schema-validated
- `src/content/writing/` — Sơn's own
- `src/content.config.ts` — the schema, and the guardrail
- `src/styles/global.css` — the whole visual system, one file
- `src/worker.js` — Cloudflare Worker: static assets + /api/comments (KV)
- `src/pages/p/` — public copies of reports flagged `public: true`
- `scripts/sync-gbrain.mjs` — reports → gbrain over MCP
- `.impeccable/mocks/` — design exploration, not shipped
