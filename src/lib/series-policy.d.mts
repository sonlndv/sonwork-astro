type SeriesLike = { id: string; data: { date: Date; draft: boolean; featured?: boolean } };
type ParentLike = { id: string; data: { draft: boolean } };
type NoteLike = { id: string; data: { series: string; draft: boolean; order: number } };

export function flowNodes(text: string): { label: string }[];
export function chooseFeatured<T extends SeriesLike>(series: T[]): T | undefined;
export function notesForSeries<P extends ParentLike, N extends NoteLike>(
  seriesId: string,
  parents: P[],
  notes: N[],
  isVisible: (entry: P | N) => boolean,
): N[];
