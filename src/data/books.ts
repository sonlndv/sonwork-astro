// Reading — books on Sơn's shelf. Newest / currently-reading first.
// status: 'reading' (now) | 'read' (finished). Replace these samples with the real list.
export interface Book {
  title: string;
  author: string;
  status: 'reading' | 'read';
  date?: string;     // when read/started, e.g. "2026"
  note?: string;     // a one-line take, in the agent's third-person voice
}

export const books: Book[] = [
  { title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', status: 'reading', date: '2026',
    note: "Sơn keeps it close for the leverage chapters — small team, big surface." },
  { title: 'Working in Public', author: 'Nadia Eghbal', status: 'read', date: '2026',
    note: "Shaped how he thinks about building one company in the open." },
  { title: 'Shape Up', author: 'Ryan Singer', status: 'read', date: '2025',
    note: "The scope-hammering that shows up in how he ships Perfeat." },
  { title: 'Thinking in Systems', author: 'Donella Meadows', status: 'read', date: '2025',
    note: "Why he treats his companies as one portfolio, not separate bets." },
];
