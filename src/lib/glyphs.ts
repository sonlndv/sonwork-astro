// Line icons for the engine's themes. 24-unit box, 1.6 stroke, round joins.
const P: Record<string, string> = {
  news:             '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 12h8M8 15h5"/>',
  country:          '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>',
  industry:         '<path d="M3 20V10l5 3v-3l5 3v-3l5 3v7z"/><path d="M8 20v-3M13 20v-3M18 20v-3M16 10V5h3v5"/>',
  company:          '<path d="M5 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M15 9h3a1 1 0 0 1 1 1v10M3 20h18"/><path d="M8 8h2M8 12h2M8 16h2M12 8h0M12 12h0"/>',
  'business-model': '<path d="M16 5a7 7 0 1 1-7.7 1.2"/><path d="M8 3v4h4"/><path d="M12 9v3l2 2"/>',
  sociology:        '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><circle cx="12" cy="16" r="2.5"/><path d="M10 9.5l2 4M14 9.5l-2 4M10.5 8h3"/>',
};
export const THEME_LABEL: Record<string, string> = {
  news: 'news', country: 'country', industry: 'industry', company: 'company', 'business-model': 'business model', sociology: 'sociology',
};
export const glyph = (type: string, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[type] ?? P.news}</svg>`;
