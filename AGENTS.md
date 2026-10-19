# Sonwork

Son's approved About-first portfolio and writing site. Astro static output is served by the existing Cloudflare Worker. PRODUCT.md and DESIGN.md describe the current product and visual system.

- Preserve the approved copy, typography, colours and layout. Make only requested changes.
- About, Trivia Hub, Keymarchy and Perfeat are approved for publication. All three posts remain draft:true until Son explicitly approves them. Preview builds may show drafts; release builds must not.
- Signup stays disabled. Do not trigger real mail flows or read local environment files or credential stores.
- Never publish employer, client or school names. Supply any private forbidden terms to review tooling from outside this repository; never embed those terms in scanner code, tests or documentation.
- Do not push, deploy or change accounts, credentials, DNS, permissions or billing without explicit authorization.
- Preserve remote history and archival tags. The pre-rebuild main is 0fe6f5dc474bd8529f416145ea1cccddaa027284. Its complete legacy readings and application source remain accessible through Git history. Do not rewrite that history.
- Keep the COMMENTS binding and its data. The new runtime does not use KV or old application APIs. Retiring an API never authorizes deleting storage or secrets.
- Run npm ci, npm run check, npm test, then npm run build and npm run test:production. Use Node >=22.22.0 and install the locked Playwright Chromium. See DEPLOY.md for deployment and rollback.
