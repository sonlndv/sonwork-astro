# The stack — sonwork.org (decision, 2026-09-03)

gbrain slug: `projects/sonwork/stack` · type: decision · owner: Son
Mirror of the decision recorded in the repo (PRODUCT.md, AGENTS.md, ALFRED.md).
Push with `put_page` when the brain is reachable; the repo copy is the source.

## The decision

One person, three runtimes, one engine.

| Runtime | Who | Does |
|---|---|---|
| AI stack | Claude (Code and Cowork) | where Son works: builds, delivers, ships the site, the tools, the programs |
| Grok Bot | Alfred, Chief Everything Officer | runs the teams, the research, the management |
| Hermes | Fred | maintains the gbrain setup and the VPS; researches for Sonar |

- Son decides. Nothing else gets a seat.
- **Sonar is the engine** the stack researches and writes with. The readings
  are its output. It is not tied to Grok Bot: every project that enters the
  portfolio uses Sonar for research.
- **The portfolio is Sonar alone** (F1 YouTube removed 2026-09-03). The next
  project is Son's call. Sonar is not an audience product; the email list is a quiet
  channel, never the pitch.
- No runtime or agent gets its own introduction on the site. The home shows the
  stack as one diagram (`src/components/Stack.astro`), one line per runtime.
- Say "Claude", never "ChatGPT". Son does not use ChatGPT co-work.
- Every agent, on any runtime, reads the repo (AGENTS.md, then ALFRED.md) and
  gbrain `projects/sonwork` before operating on the site. If gbrain is not
  reachable, say so in the diary entry and continue with the repo.

## Open

- The next project in the portfolio.

## Why

Son wants to run one bot per runtime (one Grok Bot, one Hermes) and keep Claude
as the building stack, so any agent that reads git and gbrain understands the
whole system and can operate on the site without a person explaining it.
