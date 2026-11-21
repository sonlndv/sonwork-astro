# Retained scenery

These assets were moved byte-for-byte out of `public/` during the audit remediation. They are not copied into release output. Existing components, source artwork, styles, licenses and historical browser specifications remain retained; restoring the old scene is a separate product decision, not part of a normal build.

Regenerate the retained star SVGs explicitly with `node scripts/generate-star-sky.mjs`. The ordinary Astro build no longer runs that generator. `node scripts/grade-planets.mjs` writes to this directory's `mountains/`, never the active public tree. Historical `/mountains/` and script URLs in source and reference tests describe the old served layout; they are not current release URLs.
