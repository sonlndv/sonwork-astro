// Explicit data form adapted from mdxcn GraphFlow (MIT); see THIRD-PARTY-NOTICES.md.
export function flowNodes(text) {
  if (typeof text !== 'string') throw new TypeError('Flow must be plain text');
  return text.split(/\s*(?:→|->|—>|=>)\s*/).map(label => label.trim()).filter(Boolean).map(label => ({ label }));
}

export function chooseFeatured(series) {
  const sorted = [...series].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id));
  return sorted.find(entry => entry.data.featured) ?? sorted.find(entry => !entry.data.draft);
}

export function notesForSeries(seriesId, parents, notes, isVisible) {
  for (const note of notes) {
    if (!parents.some(parent => parent.id === note.data.series) || note.id.split('/').length !== 2 || !note.id.startsWith(`${note.data.series}/`)) {
      throw new Error(`Note parent and directory must agree: ${note.id}`);
    }
  }
  const parent = parents.find(entry => entry.id === seriesId);
  if (!parent || !isVisible(parent)) return [];
  return notes.filter(note => note.data.series === seriesId && isVisible(note)).sort((a, b) => a.data.order - b.data.order);
}
