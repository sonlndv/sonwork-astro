# CLAUDE.md — sonwork.org

@AGENTS.md

`AGENTS.md` above is the whole spec: identity, session start, the routing
map, references, the memory protocol, the hard rules. It is canonical for
every tool, so nothing in it is repeated here. This file holds only what
Claude Code has that the others do not.

## What Claude has here

- **Skills.** `/file-report` files a reading (`.claude/skills/file-report/`);
  `/impeccable <command>` for design work (`.claude/skills/impeccable/`,
  v4.1.3). Before editing UI, load `reference/craft-floor.md` from it.
- **The headless browser.** `~/.claude/skills/gstack/browse/dist/browse`
  (gstack `/browse`) for screenshots; prefer it over any Chrome tool. It
  renders light unless `localStorage.theme` is set to `dark`; wait two to
  three seconds for entrance animations; reset scroll between pages.
- **The brain, two ways in.** The desktop app's own gbrain connector is
  authorized as `cowork-claude` (read, write; its tools are named
  `mcp__01ca5671…__*`). The command-line entry `gbrain` at
  https://gbrain-mcp.sonwork.org/mcp needs a one-time OAuth in an
  interactive session. Check the connector before ever saying the brain is
  unreachable; that mistake has been made once.
- **The VPS.** `ssh hermes-vps` reaches Fred's server read-only for
  diagnosis (Hermes gateway, 9router on port 20128, gbrain, the tunnel).
  Look, report, and leave changes to Fred unless Sơn asks.
- **Hooks.** GateGuard asks for facts before the first shell command, a new
  file, or a file's first edit; present them and retry. It refuses `rm`, so
  retire with `git mv` into `.impeccable/retired/`.
- **Auto-memory.** Claude's own notes live outside the repo at
  `~/.claude/projects/-Users-tuans-Projects-sonwork-astro/memory/`. They are
  Claude's working memory, never the product truth: that is `PRODUCT.md`
  and gbrain, per the memory protocol.

## Memory of decisions (do not re-litigate)

- The site is public; identity only matters for writing notes.
- Colour rule: cool = machines, warm = Sơn. Mark: LS15. Ground: near-black with
  one static light; no background pattern or motion.
- Home is an opening sequence (reversed 2026-09-03 by Sơn: not a ledger); the
  ledger and the field are the `/readings/` index; `/about/` keeps its own hero.
- No scroll snapping and no full-screen sections (tried and removed
  2026-09-03). No serif face; Sora only for headlines.
- Every panel sits exactly on the column; nothing bleeds (2026-09-03).
- "What Sonar found" is one day, one reading per theme (2026-09-04).
- The diary is a list of posts; each entry is its own page (2026-09-04).
- Impeccable critique 2026-09-02 scored 23/36; everything actionable was fixed.
