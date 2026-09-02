// Line icons for each kind of reading. 24-unit box, 1.6 stroke, round joins.
const P: Record<string, string> = {
  news:      '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 12h8M8 15h5"/>',
  breakdown: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20M8 11h6M11 8v6"/>',
  research:  '<path d="M9 3v6L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 3h8M7 15h10"/>',
  model:     '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
  analysis:  '<path d="M4 19h16"/><path d="M6 15l4-5 4 3 4-7"/>',
  technical: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14"/>',
};
export const glyph = (type: string, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[type] ?? P.analysis}</svg>`;
