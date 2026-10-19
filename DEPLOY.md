# Deployment

This tree prepares a replacement of the existing sonlndv/sonwork-astro site. A prepared local tree is not a deployment. The authorized reviewer controls pushing and publishing.

## Existing host

The Worker remains `sonwork`, compatibility date `2026-05-20`, workers.dev enabled, route `sonwork.org/*` in zone `sonwork.org`. Static assets in `dist` use the ASSETS binding. Existing Cloudflare variables are retained with keep_vars:true. The existing COMMENTS KV namespace binding is retained unchanged; the runtime performs no KV operations. No account, DNS, credential, secret or paid-service setup is required.

The existing GitHub Deploy workflow triggers on main and workflow_dispatch and uses Node 22, npm ci, and cloudflare/wrangler-action@v3 with the existing CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID repository secret references. Never copy secret values into source or logs. A separate existing Workers Builds integration may also deploy main; its settings remain unchanged. Both deployment paths must build plain production source without SHOW_DRAFTS or PUBLIC_SIGNUP variables. A nonempty NODE_ENV must equal production; other values fail closed without printing them. npm run dev remains unchanged. Local environment files are refused by release commands, without reading them.

## Checks

Use Node >=22.22.0:

```
npm ci
npx playwright install --with-deps chromium
npm run check
npm test
npm run build
npm run test:production
npx wrangler deploy --dry-run --outdir "${TMPDIR:-/tmp}/sonwork-dry-run"
```

Preview tests retain draft coverage. Wrangler build.command runs npm run build before normal dev/deploy/dry-run commands, so a stale preview dist is rebuilt as guarded production. The production gate deliberately creates a preview with draft posts and populated RSS, then verifies Wrangler replaces it with production before HTTP/browser checks. Production HTTP checks run the actual Wrangler local Worker and classify every redirect-map row and wildcard sample. They also check private query removal, unknown 404, retained icons/robots, CSS/fonts, hidden drafts, empty RSS, disabled signup and the build SHA. A wrong-SHA negative control must fail. Browser checks cover 390/1440 widths, both themes and JavaScript on/off. No real signup or email flow is exercised.

Astro uses file output and trailingSlash:never. Canonicals and internal links omit trailing slashes. Cloudflare uses drop-trailing-slash HTML handling. The assets binding supports _redirects; the Worker strips private booking/unsubscribe queries before asset handling and returns actual 410 for missing retired assets/APIs. Matching static assets bypass the Worker by default; only API, booking and explicit /404 paths run it first. not_found_handling:none lets missing legacy paths fall back to the Worker; ordinary unknowns fetch the noindex error document through ASSETS and retain HTTP 404. No /_astro/* Worker-first rule is used. Current assets beat retirement patterns. /404, /404/ and /404.html deliberately return 410; ordinary unknown paths return the custom page with status 404. /api/unsubscribe redirects without its query to truthful legacy-contact information; it does not perform or claim removal.

References: [Cloudflare redirects](https://developers.cloudflare.com/workers/static-assets/redirects/), [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

## Release identity and live readback

/release.json contains gitSHA from GITHUB_SHA or actual Git HEAD at build time. The deployment workflow queues complete deploy/readback jobs with cancel-in-progress:false and rebuilds production after preview gates and checks live identity, approved content, no draft badges, disabled signup, legacy 301/410 routes, unknown 404 and real CSS/fonts. It fails if any assertion or the exact SHA differs. Manual readback after an authorized deployment uses:

```
node scripts/verify-release.mjs https://sonwork.org FULL_DEPLOYED_GIT_SHA "${TMPDIR:-/tmp}/live-release-inventory.json"
```

Draft post source is intentionally versioned in the public repository; draft:true hides it from the website and RSS, not from repository readers. Do not use preview builds as production artifacts. Do not claim a new release is live from a build, dry-run or local HTTP result.

## History and rollback

The release commit is rooted at old public main 0fe6f5dc474bd8529f416145ea1cccddaa027284. A local archive/pre-rebuild-2026-10-19 branch also preserves that exact tree. Legacy readings and source are retained in the parent history even though the new site no longer serves the old application. Existing archival tags are retained.

Rollback is a normal revert of the public release commit on the authorized main branch through the existing CI deployment, with no force push and no KV deletion. Review the restored legacy workflow/runtime when reverting: it resumes the prior application and its old verification. No storage or secret cleanup is part of this release or its rollback.

## Public export

The public release candidate must start as a clean standalone clone on release/sonwork-rebuild at the old public main with its pre-rebuild branch. Run scripts/sanitized-release-export.mjs with explicit source, candidate and external proof paths. Optional --forbidden-file points to private terms outside both repositories; the scanner never records terms. After committing the candidate, --verify-only checks byte/hash equality again. Only public-specific document variants may differ and must be declared and reviewed. Generic credential scanning is not proof that unknown private names are absent; owner review is still required.
