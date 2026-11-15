# GitHub contribution calendar

The approved private integration adds an exact read-only `GET`/`HEAD /api/github-calendar` route. Son's API approval supersedes the earlier snapshot-only implementation brief. Builds still use the checked-in, byte-pinned public snapshot without network or credentials. JavaScript requests the same-origin endpoint on page load and about every 15 minutes while visible. GitHub processes contributions asynchronously: this is cached auto-update, not instant realtime.

## Data and failures

`src/lib/github-calendar-api.mjs` owns the provider, projection, bounded response reader, cache and fallback. The upstream URL is fixed to GitHub's official GraphQL endpoint and the query fixes `user(login: "sonlndv")`. It requests only `totalContributions` and day `date`, `contributionCount`, `contributionLevel`. The rolling window is 365 UTC dates ending today. Dates, continuity, counts, levels and total must reconcile before data is accepted. No repository, message, commit or private identity fields are returned. Public-profile aggregate counts may include anonymized activity according to the account's public profile settings; the dedicated token must not grant optional private/internal access.

The response is `{ calendar, meta: { mode, fetchedAt, stale, source } }`. Modes are `fresh`, `cache`, `stale` (last successful fetch) and `snapshot` (pinned fallback). Fetched time records the data fetch, not the last caller request. Provider errors, missing credentials, 401/403/429, timeouts, invalid/oversized data and GraphQL errors retain the last valid calendar. Upstream messages and headers are not returned or logged. Caller query parameters are rejected with 400; methods other than GET/HEAD return 405. All other legacy API retirement behavior remains unchanged.

Successful provider responses are cached in memory for 15 minutes and concurrent refreshes coalesce. Failed refreshes have at least a one-minute cooldown, respecting bounded Retry-After/rate-reset delays. Last-good data survives within that runtime only; a cold process/Worker isolate starts from the durable checked-in snapshot. This is not a globally shared or durable Cloudflare cache, and production request-volume behavior has not been measured. No cron, KV operations, storage binding or paid service is added. The existing COMMENTS binding remains untouched.

The client validates before updating, preserves focus/selection across refreshes and rolls month/grid layout when the UTC window changes. A failed refresh keeps existing squares and marks API-derived data stale in the nonvisual description. Static/no-JS data remains the pinned snapshot, with every date/count in a nonvisual semantic table. Visible UI is heading, chart, legend and contextual date/count feedback only.

## Runtime credential contract

- Production binding: `GITHUB_CALENDAR_TOKEN`, provided as a Cloudflare **Secret**, never a public variable, build variable or committed config value. It is read only inside the Worker runtime. There is no default credential, browser token, CLI-auth fallback or general GraphQL proxy.
- Private Node preview: `SONWORK_CALENDAR_TOKEN_FILE` holds an explicit **file reference**, never token contents. The runner accepts only an owned, regular, non-symlink 0600 file containing the approved opaque token; no PAT-prefix restriction is imposed. Authentication and read capability must be validated by the existing authorized credential owner, not inferred from its format. The operator must first confirm the task's credential-intake receipt says `validated_and_saved` for the approved protected reference. Do not read or try alternative credentials.
- Keep the file outside the repository, site root, logs and package. Do not put the token value in argv, console output, environment values, client storage or static assets. Do not paste it into chat.
- An explicitly authorized production release uses the existing main-only CI deployment identity. The encrypted Actions secret is named `SONWORK_GITHUB_CALENDAR_TOKEN` because GitHub reserves the `GITHUB_` prefix; the native deploy action maps it to its step-only `GITHUB_CALENDAR_TOKEN` environment variable and uploads that Worker Secret through stdin. It is not available to checkout, build, tests, or artifacts. The native action fails if its value is absent. Missing runtime credentials still yield an honest snapshot, never a connected-provider claim.

## Verification

The unit suite drives the real service through synthetic transports and checks fixed query, UTC projection, TTL, coalescing, cooldown, failures, bounded bodies, public-field allowlists and credential-file guards. Browser tests exercise real cells, tool selection, rollover, stale fallback and page lifecycle using explicitly synthetic same-origin responses. Production tests exercise the packaged Worker route without a secret; these prove fallback/routing, not GitHub authentication.

Only a successful authenticated read using the dedicated intake-validated reference followed by an actual same-origin browser refresh proves live connection. Record its source/fetched/stale state without credential contents. If the receipt is absent, keep that check explicitly pending.

Official references: [GitHub GraphQL calls](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql), [GitHub GraphQL users](https://docs.github.com/en/graphql/reference/users).
