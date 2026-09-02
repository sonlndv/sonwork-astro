# Deploying sonwork.org

**Current state (2026-09-02):** public at https://sonwork.org via a Worker route.
Deploys run from Cloudflare's Git integration (Workers Builds) on push to `main`.

## 0. Notes and identity

Everyone can read pages and notes. Writing a note needs an identity on
`ALLOWED_EMAILS`: either Cloudflare Access (preferred once set up) or the
passphrase session at `/login` (secrets `SITE_PASSPHRASE`, `SESSION_SECRET`; the
passphrase is in `~/.sonwork-passphrase` on Sơn's Mac). `/logout` ends a session.

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

## 2. Access (Zero Trust) — scripted

Create one API token in the dashboard (My Profile → API Tokens → Create → Custom):
Workers Scripts: Edit · Workers KV Storage: Edit · Account Settings: Read ·
Access: Apps and Policies: Edit · Access: Organizations, Identity Providers, and Groups: Edit · Zone: Read.

Then, once:

```bash
gh secret set CLOUDFLARE_API_TOKEN            # paste; used by GitHub Actions
CLOUDFLARE_API_TOKEN=<paste> CLOUDFLARE_ACCOUNT_ID=8eb900dcbaac8faf839d897f0e2b8716 node scripts/setup-access.mjs
```

The script is idempotent: it creates the Zero Trust org if missing, then upserts
six Access applications (public paths bypass, everything else allow-listed to
son@perfeat.org and tuanson.le03@gmail.com, including the workers.dev preview).
Add a reader by adding their email to `ALLOWED_EMAILS` and re-running.

## 3. Continuous deploy (how agents publish)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.
It needs two repository secrets, set once:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --body "<account id from: npx wrangler whoami>"
gh secret set CLOUDFLARE_API_TOKEN            # paste a token made from the
                                              # "Edit Cloudflare Workers" template
```

After that, an agent's commit of one markdown file is a deploy. A malformed
report fails the build in CI and never reaches the site.

## 4. Local development

```bash
npm run dev            # site only, no API
npm run build && npm run dev:worker   # full stack at http://localhost:8787, you are son@perfeat.org
```

## 5. gbrain (optional)

```bash
npm run sync -- --dry-run
npm run sync
```

Pushes every report to `shared/projects/sonwork/readings/<slug>`. Notes: visit
`/api/comments/export` while signed in, save it, then `npm run sync -- --notes notes.md`.

## Publishing a report

Set `public: true` in its frontmatter and redeploy. It appears at `/p/<slug>/`,
indexable, without notes. The private page at `/readings/<slug>/` links to it.
