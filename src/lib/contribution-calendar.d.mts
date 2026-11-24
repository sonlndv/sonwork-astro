export interface ContributionDay { date: string; count: number; level: number; }
export interface ContributionSnapshot {
  source: string;
  visibility: string;
  metric: string;
  retrievedAt: string;
  from: string;
  through: string;
  days: ContributionDay[];
  total: number;
}
export function validateCalendar(snapshot: unknown): ContributionSnapshot;
export function calendarSummary(snapshot: ContributionSnapshot, lang?: string): { label: string; range: string };
export function calendarLayout(snapshot: ContributionSnapshot): {
  days: ContributionDay[];
  total: number;
  offset: number;
  weeks: number;
  months: { label: string; column: number }[];
};
