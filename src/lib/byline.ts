// Who wrote a reading, and on which runtime. Agents file under their own
// name (AGENTS.md); the runtime is the stack decision of 2026-09-03
// (OPERATING.md): Fred writes from Hermes, Claude from the AI stack, and every
// other research agent is on Alfred's team on Grok Bot. Add a name here when
// a new runtime appears; do not add one per agent.
const RUNTIME: Record<string, string> = {
  fred: 'Hermes',
  claude: 'Claude',
};

export const runtimeOf = (author: string): string =>
  RUNTIME[author.trim().toLowerCase()] ?? 'Grok Bot';
