# Safe public source and release

## Scope

The current website publishes About, exact public contact links, a generic **Coming soon** Series surface and the existing approved pages. Tool selection is not a promise of future Series topics. Unapproved writing is not authorized for publication by a website release.

The canonical private source retains its two original Series MDX drafts and their history. A fresh public release clone excludes exactly those two sources, not the three already-public draft posts. The existing post draft flags and production guards remain unchanged. In the public clone those two unpublished Series paths return 404 even in preview; the five retained compatibility paths render generic Coming soon. The private preview retains generic noindex compatibility for the private draft-derived paths.

## Current-base projection

Do not push or merge the private branch's commit graph. `scripts/prepare-public-source.mjs` projects only frozen tracked file bytes into a fresh standalone clone at **the actual current public main**, on a dedicated non-main candidate branch. It checks the live public main ref before writing. No old-base reset, force-push, canonical staging, private history rewrite or remote write occurs.

The generated `.public-source.json` declares the exact two exclusions; it contains no local paths, credentials, private source SHA or draft prose. Shared tests require the originals in private source, and require their actual absence in the explicitly declared public projection. Missing files without that exact declaration fail. The public marker does not approve content or authorize publication.

Pass full source and base SHAs without normalization. Proof files must be outside both repositories and new for every attempt. After a normal local commit, repeat with `--verify-only`: it requires a clean public candidate that is exactly one child of the recorded actual main, then verifies every tracked path, mode and byte hash against the source plus exact exclusions/declaration. The external proof records the private SHA, public SHA/tree/parent, every file hash, exclusions and optional declared documentation variants. It never stores draft bodies.

```sh
node scripts/prepare-public-source.mjs "$PRIVATE_SOURCE" "$FRESH_PUBLIC_CLONE" "$PRIVATE_SHA" "$ACTUAL_MAIN_SHA" "$NEW_EXTERNAL_PREPARE_PROOF"
# Commit the already named/staged candidate paths normally in the fresh clone.
node scripts/prepare-public-source.mjs "$PRIVATE_SOURCE" "$FRESH_PUBLIC_CLONE" "$PRIVATE_SHA" "$ACTUAL_MAIN_SHA" "$NEW_EXTERNAL_COMMITTED_PROOF" --verify-only
```

Optional `--variants "$EXTERNAL_DOC_DIRECTORY"` accepts only existing documentation paths. Record canonical/public hashes and review exact replacements; no application/test/config variant is allowed. Do not supply private local paths, canvas or administrative data. No private forbidden terms belong in repository scanner code or fixtures; supply any such terms externally to authorized review tooling.

## Main-only calendar Secret and immutable deployment

The encrypted Actions secret **SONWORK_GITHUB_CALENDAR_TOKEN** maps to step environment and Cloudflare Secret **GITHUB_CALENDAR_TOKEN** only inside the guarded native deploy action. GitHub reserves custom secret names beginning `GITHUB_`. Keep existing Cloudflare token/account references; do not extract their values or configure another identity. No frontend/build/test step receives the calendar credential.

`prepare-calendar-secret-upload.mjs` first validates the exact production artifact SHA and every byte, requires Worker name `sonwork` and `keep_vars: true`, then creates a separate fresh uploader directory with only that verified name/date. Wrangler installation stays there, outside both the source checkout and immutable artifact.

The reviewed native v3 action uploads `secrets` through **stdin JSON**, not secret-valued argv. Its uploader resolves configuration from `workingDirectory`, independently of the later deploy `--config`. A read-only `wrangler secret list > /dev/null` precommand refuses an absent Worker without printing secret names; only then may its bulk uploader patch the single named Secret. Missing secret environment values fail the native action. No null/delete secret entry is provided. Existing secrets, COMMENTS, routes and account settings are not replaced by the upload config.

Deployment still requires successful tests, main-only event/ref, current-main SHA under the existing deployment lock, and the exact verified artifact. The final deploy explicitly selects that artifact's config with `--no-bundle`, not the thin uploader config; there is no site rebuild. Artifact bytes are checked again afterward. Live verification checks exact source, publication/API protections and a real `github-graphql`, non-stale, fresh/cache calendar response. Snapshot-only production tests are not proof of live credentials.

Run the complete required gates on both frozen private source and admitted public candidate. Retain distinct logs and expected route/Lighthouse scopes; public preview lacks the two excluded private routes. Independently review the full delta from actual public main and all variants before release. The release operator alone pushes/merges/deploys through normal controls, verifies remote/CI/live identities and owns the rollback packet. A prepared export or green local run is not publication.

Official references: [Wrangler Action](https://github.com/cloudflare/wrangler-action), [Wrangler secret commands](https://developers.cloudflare.com/workers/wrangler/commands/#secret), [Actions encrypted secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).
