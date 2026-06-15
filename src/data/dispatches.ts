// Dispatches — short news items, filed by Sơn's agent.
// Newest first. Edit / add freely; the home shows the latest few.
export interface Dispatch {
  date: string;   // display, e.g. "Jun 14"
  iso: string;    // sortable, e.g. "2026-06-14"
  text: string;
  tag: string;    // Perfeat | Paddock | Interview | Note | ...
}

export const dispatches: Dispatch[] = [
  { date: 'Jun 14', iso: '2026-06-14', text: "Perfeat — the first public TestFlight build is live.", tag: 'Perfeat' },
  { date: 'Jun 02', iso: '2026-06-02', text: "Paddock — first live F1 timing feed working end to end.", tag: 'Paddock' },
  { date: 'May 20', iso: '2026-05-20', text: "New interview filed: Sơn on building solo.", tag: 'Interview' },
  { date: 'May 06', iso: '2026-05-06', text: "Perfeat — meal-rating flow rebuilt around a single tap.", tag: 'Perfeat' },
];
