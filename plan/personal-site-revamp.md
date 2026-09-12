# Sonwork personal site revamp

Status: design and backend plan, implementation pending specialist synthesis and visual verification.

## Decision

Reframe Sonwork's public home from a primarily reading/archive surface into a personal profile and conversation surface. Preserve Readings and Projects as secondary proof of work. Keep the LS15 mark, blue/cyan identity, Sora typography, and restrained warm accent for Son's human action. Borrow Arx's structural discipline, not its company copy, visual identity, or claims.

Primary action: **Book time with Son**.
Secondary action: **See what Son is building**.

## Proposed information architecture

- `/` — profile-led home: who Son is, what he does, selected work, how he works, booking CTA.
- `/about/` — fuller identity and working principles.
- `/work/` or `/projects/` — current projects and selected outcomes; no employer or client names.
- `/readings/` — existing Sonar archive, clearly secondary to the personal profile.
- `/book/` — short qualification form and available booking path.
- `/contact/` — optional fallback email route, not a second competing CTA.

## Home composition

1. Header: LS15, `About`, `Work`, `Readings`, one `Book time` action.
2. Hero: one direct identity statement, one short explanation, portrait/mark or working-system visual. No invented metrics.
3. What I do: three unequal lanes, not a generic three-card grid: build, study, and help people think/work through a problem.
4. How a conversation works: request → Son reviews context → time is booked → conversation happens. Make the mechanism visible.
5. Selected work: current, approved projects only; never name employer/client; no stale projects.
6. Working principles: short, concrete lines.
7. Booking CTA: one clear form and expected response, with no unapproved promise about timing.
8. Readings footer bridge: Sonar/readings as evidence of how Son thinks, not the main identity.

## Design direction

- Surface: Decide/Learn, with a secondary Explore surface for readings.
- Dark blue ground, cyan as the machine/structural accent, amber only for Son's human decision or action.
- Strong horizontal section grammar from Arx: labelled sections, rules, deliberate density, clear sequence.
- Preserve LS15 as the only site mark.
- Use diagrams of the booking/conversation mechanism, not decorative dashboards.
- No gradients as decoration, glass cards, fake metrics, testimonials, employer/client details, or Arx branding.
- Mobile is a separate composition: one-column flow, full-width booking action, no tiny diagrams.

## Backend direction

Start with a request-to-book flow rather than a full account/registration system. A visitor submits name, email, context, and preferred time window. The Worker validates and rate-limits the request, stores a minimal record in a dedicated KV namespace or D1 only if querying/admin review requires it, and sends Son a notification through an approved transactional email provider. The visitor receives a confirmation only after successful storage.

Recommended first implementation:

- `POST /api/booking-request`
- Honeypot + minimum elapsed time + IP/email rate limits
- Strict input length and email validation
- KV record with random request ID, status, created timestamp, contact fields, message, consent, and expiry
- No passwords and no visitor accounts
- Admin review by email; Son sends a calendar link or proposes a time
- Optional later integration with Cal.com or Google Calendar after Son chooses the calendar and provides credentials/configuration
- Secrets only through mode-600 configuration or platform secret storage, never repo/chat

Tomorrow's inputs needed from Son:

- public booking email
- calendar system and timezone
- whether to use direct calendar booking or manual review first
- approved response-time wording
- transactional email provider and sender domain
- retention period and whether marketing follow-up is allowed

## Product-team synthesis

### Product Director decision

- Primary audience: people evaluating whether Son is the right person to speak with, collaborators, professional contacts, and returning readers.
- Primary goal: convert qualified visitors into a conversation without making Sonwork feel like a generic consultancy.
- Primary CTA: **Book time with Son**.
- Secondary CTA: **Read the archive**.
- Acceptance bar: a new visitor identifies Son, understands what he does, and finds the booking route within seconds; existing reading URLs remain usable.
- Never invent employers, clients, testimonials, credentials, pricing, availability, outcomes, affiliations, or personal biography.

### UX/UI direction: Signal / Practice / Time

- Surface: primarily Decide/Learn; booking is Configure; readings remain Explore.
- Home sequence:
  1. Opening signal: asymmetric hero with direct identity statement and an authored working-position panel.
  2. Path selector: Read / Work together / Book time, as connected destination rows rather than equal feature cards.
  3. Practice sequence: Notice → Frame → Make → Review.
  4. Editorial proof: one featured reading plus two supporting entries.
  5. Closing invitation with one dominant booking action.
- About: belief/evidence rows, not a résumé dump.
- Contact: one-column form with clear prompts and explicit success/error states.
- Booking: session type → date → time → details → review; manual confirmation first.
- Visual language: dark blue, cyan for active/system signals, amber only for Son's human decision or attention, 2–6px radii, rules and asymmetry instead of cards and gradients.
- Mobile: one-column composition, persistent Book time action, explicit accordions, no hover dependency, 44px targets.
- Motion: restrained 160–500ms state and continuity transitions; no continuous ambient animation; disable transforms and reveals under reduced motion.

### Backend decision

- Build a **meeting-request system**, not user registration or instant booking.
- `POST /api/meeting-requests` validates, rate-limits, deduplicates, stores a short-lived pending request, and sends notifications.
- Visitor receives acknowledgement without a promised time.
- Son reviews manually, proposes or confirms a time, then sends the final confirmation.
- Use KV initially for low-volume request state, dedupe, tokens, and TTLs. Move to D1 only if reporting or transactional scheduling requires it.
- Email is notification only in phase 1. Do not parse arbitrary replies or let email alone mutate state.
- Calendar integration is phase 2: read-only availability first, event creation only after explicit confirmation.
- Required protections: honeypot, minimum elapsed time, IP/email/global rate limits, bounded fields, origin/content checks, opaque IDs, hashed visitor tokens, escaped output, admin authentication, idempotent state transitions, no secrets in the repo.

## Delivery gates

- Product Director: approve positioning, page hierarchy, copy boundaries, and acceptance criteria.
- UX/UI Designer: produce the visual system and responsive page compositions.
- Frontend Engineer: implement Astro pages/components using existing tokens and LS15 assets.
- Backend/Integration Engineer: implement request endpoint, storage, notification adapter, validation, and tests; no production secrets.
- QA/Release Engineer: run build, type checks, accessibility, responsive browser checks, form success/error/abuse cases, and secret/disclosure scan.
- Jarvis: route dependencies, reconcile conflicts, verify evidence, and present only a release recommendation.
- Son: supply final identity/copy decisions and approve any public deployment or external email/calendar commitment.
