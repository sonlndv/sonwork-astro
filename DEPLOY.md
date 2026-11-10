# Deployment

This tree prepares a replacement of the existing sonlndv/sonwork-astro site. A prepared local tree is not a deployment. The authorized reviewer controls pushing and publishing.

## Existing host

The Worker remains `sonwork`, compatibility date `2026-05-20`, workers.dev enabled, route `sonwork.org/*` in zone `sonwork.org`. Static assets in `dist` use the ASSETS binding. Existing Cloudflare variables are retained with keep_vars:true. The existing COMMENTS KV namespace binding is retained unchanged; the runtime performs no KV operations. No account, DNS, credential, secret or paid-service setup is required.

The GitHub CI workflow (`.github/workflows/ci.yml`) validates pushes, pull requests and manual runs using Node 22. Successful main push/manual runs upload a same-run production artifact; a dependent deployment job uses cloudflare/wrangler-action@v3 with the existing CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID repository secret references. Never copy secret values into source or logs. Pull-request artifacts cannot enter deployment. A separate existing Workers Builds integration may also deploy main; its settings remain unchanged. Release builds must not use SHOW_DRAFTS or PUBLIC_SIGNUP variables. A nonempty NODE_ENV must equal production; other values fail closed without printing them. npm run dev remains unchanged. Local environment files are refused by release commands, without reading them.

## Checks

Use Node >=22.22.0:

```
npm ci
npx playwright install --with-deps chromium
npm run check
npm test
npm run build
ARTIFACT_ROOT="$(mktemp -d)"
npm run test:production -- --artifact-output "$ARTIFACT_ROOT/production"
```

Preview tests retain draft coverage. Wrangler build.command runs npm run build before normal dev/deploy/dry-run commands, so a stale preview dist is rebuilt as guarded production. The production gate creates a preview with draft posts and populated RSS, then verifies Wrangler replaces it with production. In CI, `--use-preview` reuses the preview already produced by npm test without skipping the guarded production rebuild. `--artifact-output` packages the resulting dist, dry-run bundled Worker, no-build/no-bundle Wrangler configuration, source SHA, toolchain version and file hashes. HTTP/browser checks then run that exact artifact through local Wrangler, and its file integrity is checked again afterward. HTTP checks classify every redirect-map row and wildcard sample, private query removal, unknown 404, retained icons/robots, CSS/fonts, hidden drafts, the approved Note and its single RSS item, disabled signup and the build SHA. A wrong-SHA negative control must fail. Browser checks cover 390/1440 widths, both themes and JavaScript on/off. No real signup or email flow is exercised.

Closed-signup checks require a noninteractive notice on Home and `/subscribe`, no email field or submit control, and native Contact navigation. The legacy Subscribe route remains available for truthful removal information. These checks never submit an email.

Astro uses file output and trailingSlash:never. Canonicals and internal links omit trailing slashes. Cloudflare uses drop-trailing-slash HTML handling. The assets binding supports _redirects; the Worker strips private booking/unsubscribe queries before asset handling and returns actual 410 for missing retired assets/APIs. Matching static assets bypass the Worker by default; only API, booking and explicit /404 paths run it first. not_found_handling:none lets missing legacy paths fall back to the Worker; ordinary unknowns fetch the noindex error document through ASSETS and retain HTTP 404. No /_astro/* Worker-first rule is used. Current assets beat retirement patterns. /404, /404/ and /404.html deliberately return 410; ordinary unknown paths return the custom page with status 404. /api/unsubscribe redirects without its query to truthful legacy-contact information; it does not perform or claim removal.

References: [Cloudflare redirects](https://developers.cloudflare.com/workers/static-assets/redirects/), [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

## Release identity and live readback

/release.json contains gitSHA from GITHUB_SHA or actual Git HEAD at build time. CI runs full validation once, then the main-only deployment job downloads its own successful run's artifact and verifies the full source SHA and every packaged file hash. It retains the cancel-in-progress:false deployment/readback lock and skips superseded runs after checking current main under that lock. Deployment uses the artifact's matching Wrangler version and exact bundled Worker/assets with no site build or rebundling. Live readback checks identity, approved content, no draft badges, disabled signup, legacy 301/410 routes, unknown 404 and real CSS/fonts. It fails if any assertion or the exact SHA differs. Manual readback after an authorized deployment uses:

```
node scripts/verify-release.mjs https://sonwork.org FULL_DEPLOYED_GIT_SHA "${TMPDIR:-/tmp}/live-release-inventory.json"
```

Draft post source is intentionally versioned in the public repository; draft:true hides it from the website and RSS, not from repository readers. Do not use preview builds as production artifacts. Do not claim a new release is live from a build, dry-run or local HTTP result.

## History and rollback

The release commit is rooted at old public main 0fe6f5dc474bd8529f416145ea1cccddaa027284. A local archive/pre-rebuild-2026-10-19 branch also preserves that exact tree. Legacy readings and source are retained in the parent history even though the new site no longer serves the old application. Existing archival tags are retained.

Rollback is a normal revert of the public release commit on the authorized main branch through the existing CI deployment, with no force push and no KV deletion. Review the restored legacy workflow/runtime when reverting: it resumes the prior application and its old verification. No storage or secret cleanup is part of this release or its rollback.

## Public export

The public release candidate must start as a clean standalone clone on release/sonwork-rebuild at the old public main with its pre-rebuild branch. Run scripts/sanitized-release-export.mjs with explicit source, candidate and external proof paths. Optional --forbidden-file points to private terms outside both repositories; the scanner never records terms. After committing the candidate, --verify-only checks byte/hash equality again. Only public-specific document variants may differ and must be declared and reviewed. Generic credential scanning is not proof that unknown private names are absent; owner review is still required.

## Local design checks

Impeccable's project hook is enabled in `.impeccable/config.json`; local consent stays in the gitignored `.impeccable/config.local.json`. The native omp adapter is `.omp/hooks/post/impeccable.js` and requires the installed engine at `~/.impeccable/bin/0.1.17/impeccable`. Native hooks load when the assistant session starts or reloads; use `/reload` after adding the adapter. It runs the engine's configured post-edit checks after successful UI writes/edits and appends findings to the tool result without changing or blocking the edit. It does not run in the website. Edits made outside those tools still need a manual detector pass. Disable checks with `~/.impeccable/bin/0.1.17/impeccable hooks off`.
