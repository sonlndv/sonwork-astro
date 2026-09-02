# Deploying sonwork.org

Cloudflare Worker with static assets, KV for notes, Access for the door.
Everything below is a one-time setup; after it, `npm run deploy` is the whole release.

## 1. Cloudflare

```bash
npx wrangler login
npx wrangler kv namespace create COMMENTS
```

Paste the `id` it prints into `wrangler.jsonc` under `kv_namespaces`.

```bash
npm run deploy
```

Then in the Cloudflare dashboard, route the Worker to `sonwork.org` (Workers → sonwork → Settings → Domains & Routes).

## 2. Access (Zero Trust)

Free to 50 users. Create these applications, most specific first:

| Application path | Policy |
|---|---|
| `sonwork.org/p/*` | **Bypass** · Everyone (public reports) |
| `sonwork.org/_astro/*` | **Bypass** · Everyone (stylesheets for public pages) |
| `sonwork.org/favicon.svg`, `sonwork.org/robots.txt` | **Bypass** · Everyone |
| `sonwork.org/*` | **Allow** · emails: son@perfeat.org, tuanson.le03@gmail.com |

The Worker reads `Cf-Access-Authenticated-User-Email` to decide who may write notes.
Only addresses in `ALLOWED_EMAILS` (wrangler.jsonc) can write; everyone Access admits can read.
Add an invited reader by adding their email to the Allow policy. They see everything, including your notes.
To let someone read without seeing notes, that needs a second Worker rule; not built.

## 3. Local development

```bash
npm run dev            # site only, no API
npm run build && npm run dev:worker   # full stack at http://localhost:8787, you are son@perfeat.org
```

## 4. gbrain

```bash
npm run sync -- --dry-run
npm run sync
```

Pushes every report to `shared/projects/sonwork/reports/<slug>`. Notes: visit
`/api/comments/export` while signed in, save it, then `npm run sync -- --notes notes.md`.

## Publishing a report

Set `public: true` in its frontmatter and redeploy. It appears at `/p/<slug>/`,
indexable, without notes. The private page at `/reports/<slug>/` links to it.
