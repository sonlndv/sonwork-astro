# Deployment

This tree prepares a replacement of the existing sonlndv/sonwork-astro site. A prepared local tree is not a deployment. The authorized reviewer controls pushing and publishing.

## Existing host

The Worker remains `sonwork`, compatibility date `2026-05-20`, workers.dev enabled, route `sonwork.org/*` in zone `sonwork.org`. Static assets in `dist` use the ASSETS binding. Existing Cloudflare variables are retained with keep_vars:true. The existing COMMENTS KV namespace binding is retained unchanged; the runtime performs no KV operations. The calendar has an exact fixed-account read-only API; without a runtime credential it returns the pinned public snapshot. An explicitly authorized release maps the encrypted Actions secret SONWORK_GITHUB_CALENDAR_TOKEN to the runtime Secret GITHUB_CALENDAR_TOKEN through the guarded native deploy action only. This adds no account, DNS, KV or paid-service change. See docs/GITHUB-CALENDAR-API.md and docs/PUBLIC-SOURCE.md for cache/fallback, private-source exclusions and exact secret-upload isolation.

The GitHub CI workflow (`.github/workflows/ci.yml`) validates pushes, pull requests and manual runs using Node 22. Successful main push/manual runs upload a same-run production artifact; a dependent deployment job uses the reviewed v3 cloudflare/wrangler-action pinned by commit, with the existing CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID repository secret references. Never copy secret values into source or logs. The calendar credential is scoped only to that action, not builds/tests/artifacts. Pull-request artifacts cannot enter deployment. A separate existing Workers Builds integration may also deploy main; its settings remain unchanged. Release builds must not use SHOW_DRAFTS or PUBLIC_SIGNUP variables. A nonempty NODE_ENV must equal production; other values fail closed without printing them. npm run dev remains unchanged. Local environment files are refused by release commands, without reading them.

## Checks

Use Node >=22.22.0:

```
npm ci
npx playwright install chromium
npm run check
npm test
npm run build
ARTIFACT_ROOT="$(mktemp -d "${TMPDIR:?Set a safe artifact workspace}/sonwork-artifact.XXXXXXXX")"
npm run test:production -- --artifact-output "$ARTIFACT_ROOT/production"
```

Preview tests retain draft coverage. Wrangler build.command runs npm run build before normal dev/deploy/dry-run commands, so a stale preview dist is rebuilt as guarded production. The production gate creates a preview with draft posts and populated RSS, then verifies Wrangler replaces it with production. In CI, `--use-preview` reuses the preview already produced by npm test without skipping the guarded production rebuild. `--artifact-output` packages the resulting dist, dry-run bundled Worker, no-build/no-bundle Wrangler configuration, source SHA, toolchain version and file hashes. HTTP/browser checks then run that exact artifact through local Wrangler, and its file integrity is checked again afterward. HTTP checks classify every redirect-map row and wildcard sample, private query removal, unknown 404, retained icons/robots, CSS/fonts, hidden drafts, the approved Note and its single RSS item, disabled signup and the build SHA. A wrong-SHA negative control must fail. Browser checks cover 390/1440 widths, both themes and JavaScript on/off. No real signup or email flow is exercised.

Closed-signup checks require no Home signup section, a noninteractive notice on `/subscribe`, no email field or submit control, and a truthful native Contact mailto in the footer. The legacy Subscribe route remains available for truthful removal information. These checks never submit an email.

The synthetic native-uploader integration check validates every mutating request's method, Worker endpoint, merge-patch content type and single-secret payload. It verifies unrelated secrets survive repeated uploads and that a missing-Worker precommand permits no writes. Read-only probes and idempotent repeats are not pinned to a total HTTP-call count.

The active Doop checks cover persistent themes, native routes/navigation, exact public About contacts, five simple tool purposes, contribution-calendar data/API/fallback and 320–1440px/200% text reflow. Series index and every retained current Series URL show only the generic Series/Coming soon state and metadata, without planned topics, counts or teasers. All MDX material and draft flags are preserved; source-confirmed draft paths remain noindex in preview and404 in release. Historical scenic specs remain in `tests/historical/pre-doop/`; the retired reader/simulation browser contract is retained in `tests/historical/series-before-empty/` because that content is no longer shown to visitors. Lighthouse still covers every built preview route with unchanged performance/accessibility and applicable SEO/noncrawlable floors. No route is omitted to make the gate green.

For a private design review, build with `npm run build:preview`, copy only `dist/` to an immutable artifact directory, then use `node scripts/private-preview.mjs /absolute/built-artifact PORT`. It binds only 127.0.0.1, adds noindex/no-store even to 404s, rejects obvious source roots and stops after eight hours. Verify both the port and existing proxy targets before starting: a loopback bind alone does not rule out an existing reverse proxy. No new tunnel, Serve mapping or public endpoint is part of this workflow. Son separately authorized the existing exact tailnet HTTPS4373 → loopback4371 review route; task evidence owns that bounded service, snapshot, lifetime and rollback. Preserve other routes and never force-restart another owner. Keep source/byte manifests and process ownership beside the artifact; do not publish preview output.

Astro uses file output and trailingSlash:never. Canonicals and internal links omit trailing slashes. Cloudflare uses drop-trailing-slash HTML handling. The assets binding supports _redirects; the Worker strips private booking/unsubscribe queries before asset handling and returns actual 410 for missing retired assets/APIs. Matching static assets bypass the Worker by default; only API, booking and explicit /404 paths run it first. not_found_handling:none lets missing legacy paths fall back to the Worker; ordinary unknowns fetch the noindex error document through ASSETS and retain HTTP 404. No /_astro/* Worker-first rule is used. Current assets beat retirement patterns. /404, /404/ and /404.html deliberately return 410; ordinary unknown paths return the custom page with status 404. /api/unsubscribe redirects without its query to truthful legacy-contact information; it does not perform or claim removal.

References: [Cloudflare redirects](https://developers.cloudflare.com/workers/static-assets/redirects/), [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

## Release identity and live readback

/release.json contains gitSHA from GITHUB_SHA or actual Git HEAD at build time. CI runs full validation once, then the main-only deployment job downloads its own successful run's artifact and verifies the full source SHA and every packaged file hash. It retains the cancel-in-progress:false deployment/readback lock and skips superseded runs after checking current main under that lock. Deployment uses the artifact's matching Wrangler version and exact bundled Worker/assets with no site build or rebundling. Live readback checks identity, approved content, no draft badges, disabled signup, legacy 301/410 routes, unknown 404 and real CSS/fonts. It fails if any assertion or the exact SHA differs. Manual readback after an authorized deployment uses:

```
node scripts/verify-release.mjs https://sonwork.org FULL_DEPLOYED_GIT_SHA "${TMPDIR:-/tmp}/live-release-inventory.json"
```

The three already-public draft post sources remain versioned with draft:true; that hides them from the website and RSS, not repository readers. The two newly private Series MDX sources are different: preserve them unchanged in canonical private source/history and exclude them entirely from the public projection/history. Public projection tests explicitly assert their absence and 404s instead of silently skipping them. See docs/PUBLIC-SOURCE.md. Do not use preview builds as production artifacts. Do not claim a new release is live from a build, dry-run or local HTTP result. After authorized deployment, also run `node scripts/verify-live-calendar.mjs https://sonwork.org FULL_DEPLOYED_GIT_SHA`; fallback-only tests are not live-provider evidence.

## History and rollback

The original rebuild remains descended from old public main 0fe6f5dc474bd8529f416145ea1cccddaa027284. A local archive/pre-rebuild-2026-10-19 branch also preserves that exact tree. Current incremental release candidates are one normal child of the actual current public main, not a reset to that old base. Legacy readings and source remain in parent history even though the new site no longer serves the old application. Existing archival tags are retained.

Rollback is a normal revert of the public release commit on the authorized main branch through the existing CI deployment, with no force push and no KV deletion. Review the restored legacy workflow/runtime when reverting: it resumes the prior application and its old verification. No storage or secret cleanup is part of this release or its rollback.

## Public export

The old scripts/sanitized-release-export.mjs is deliberately pinned to the original rebuild and must not export a current incremental release. Use scripts/prepare-public-source.mjs from a frozen clean canonical source, a fresh standalone current-main clone on a dedicated non-main branch and new external proof paths. It checks actual remote main, omits exactly the two private MDX sources, preserves the already-public drafts, and verifies exact paths/modes/bytes plus the normal public parent/tree. After committing normally, --verify-only binds the public SHA. Only declared existing-document variants may differ beyond the exact exclusions and generated public-scope declaration. Never push raw private commit history. See docs/PUBLIC-SOURCE.md for commands and source/test distinctions. Generic credential scanning does not prove unknown private names absent; owner review still applies, with private forbidden terms supplied only outside the repository.

## Local design checks

Impeccable's project hook is enabled in `.impeccable/config.json`; local consent stays in the gitignored `.impeccable/config.local.json`. The native omp adapter is `.omp/hooks/post/impeccable.js` and requires the installed engine at `~/.impeccable/bin/0.1.17/impeccable`. Native hooks load when the assistant session starts or reloads; use `/reload` after adding the adapter. It runs the engine's configured post-edit checks after successful UI writes/edits and appends findings to the tool result without changing or blocking the edit. It does not run in the website. Edits made outside those tools still need a manual detector pass. Disable checks with `~/.impeccable/bin/0.1.17/impeccable hooks off`.
