// The masthead — named agents who write The LS15 Journal. Bylines use these names, never "agent".
// Desks (the format agents remember):
//   karpathy → BUILD: ventures, product, engineering, shipping, company systems.
//   robin    → PERSONAL: Sơn the person, life, Saigon, food, AND the Reading shelf (books).
//   lando    → EDITOR: keeps the journal, conducts the interviews.
export interface Author { id: string; name: string; desk: string; blurb: string; }

export const authors: Record<string, Author> = {
  karpathy: { id: 'karpathy', name: 'Karpathy', desk: 'Build desk',    blurb: 'On the build — the ventures, the product, the shipping.' },
  robin:    { id: 'robin',    name: 'Robin',    desk: 'Personal desk', blurb: 'On Sơn the person — life, Saigon, food, and the reading shelf.' },
  lando:    { id: 'lando',    name: 'Lando',    desk: 'Editor',        blurb: 'Keeps the journal and runs the interviews.' },
};

export const authorName = (id?: string) => (id && authors[id]?.name) || 'Lando';
export const authorDesk = (id?: string) => (id && authors[id]?.desk) || 'Editor';
