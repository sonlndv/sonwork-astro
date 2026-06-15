// Reading — books on Sơn's shelf. Newest / currently-reading first.
// status: 'reading' (now) | 'read' (finished).
// NOTE: only books actually known from the brain go here (no invented titles).
// Sơn: send your real list and these get added — title, author, status, date, a one-line note.
export interface Book {
  title: string;
  author: string;
  status: 'reading' | 'read';
  date?: string;
  note?: string;
}

export const books: Book[] = [
  { title: 'Influence: The Psychology of Persuasion', author: 'Robert B. Cialdini', status: 'read',
    note: "On Sơn's shelf — how people actually decide, which carries into how he thinks about product and persuasion." },
];
