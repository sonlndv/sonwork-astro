// Note translation pairing. A note id is `<series>/<slug>`; a slug ending in
// `-en` or `-vi` is one half of a translation pair, matched to its sibling by
// the shared id with that suffix removed. A slug with no such suffix has no
// pair and is treated as English with no Vietnamese translation yet.
/** @typedef {'en' | 'vi'} Lang */

/** @type {Lang[]} */
export const LANGS = ['en', 'vi'];
/** @type {Record<Lang, string>} */
export const LANG_LABELS = { en: 'English', vi: 'Tiếng Việt' };

const SUFFIX = /-(en|vi)$/;

/** @returns {Lang} */
export function languageOf(noteId) {
  return /** @type {Lang} */ (SUFFIX.exec(noteId)?.[1] ?? 'en');
}

export function topicOf(noteId) {
  return noteId.replace(SUFFIX, '');
}

// `notes` is every note already selected for the same series (sorted or not).
// Returns one entry per language in LANGS: the matching note, or undefined
// when that language has no translation yet.
export function translationsOf(note, notes) {
  const topic = topicOf(note.id);
  const byLang = new Map(notes.filter(candidate => topicOf(candidate.id) === topic).map(candidate => [languageOf(candidate.id), candidate]));
  return LANGS.map(lang => ({ lang, label: LANG_LABELS[lang], note: byLang.get(lang) }));
}
