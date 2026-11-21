import test from 'node:test';
import assert from 'node:assert/strict';
import { languageOf, topicOf, translationsOf, topicsOf, LANGS, LANG_LABELS } from '../../src/lib/i18n-policy.mjs';

const note = id => ({ id });

test('languageOf reads the trailing -en/-vi suffix and defaults untagged notes to English', () => {
  assert.equal(languageOf('how-i-use-openmaus/openmaus-explained-en'), 'en');
  assert.equal(languageOf('how-i-use-openmaus/openmaus-explained-vi'), 'vi');
  assert.equal(languageOf('me/the-joy-of-malleable-products'), 'en');
});

test('topicOf strips only the trailing language suffix, leaving untagged ids untouched', () => {
  assert.equal(topicOf('how-i-use-openmaus/openmaus-explained-en'), 'how-i-use-openmaus/openmaus-explained');
  assert.equal(topicOf('how-i-use-openmaus/openmaus-explained-vi'), 'how-i-use-openmaus/openmaus-explained');
  assert.equal(topicOf('me/the-joy-of-malleable-products'), 'me/the-joy-of-malleable-products');
});

test('translationsOf pairs a note with its sibling in the other language', () => {
  const en = note('how-i-use-openmaus/openmaus-explained-en');
  const vi = note('how-i-use-openmaus/openmaus-explained-vi');
  const unrelated = note('how-i-use-openmaus/other-note-en');
  assert.deepEqual(translationsOf(en, [en, vi, unrelated]), [
    { lang: 'en', label: 'English', note: en },
    { lang: 'vi', label: 'Tiếng Việt', note: vi },
  ]);
  assert.deepEqual(translationsOf(vi, [en, vi, unrelated]), [
    { lang: 'en', label: 'English', note: en },
    { lang: 'vi', label: 'Tiếng Việt', note: vi },
  ]);
});

test('translationsOf reports a missing side as undefined instead of guessing a link', () => {
  const soloEn = note('me/the-joy-of-malleable-products');
  assert.deepEqual(translationsOf(soloEn, [soloEn]), [
    { lang: 'en', label: 'English', note: soloEn },
    { lang: 'vi', label: 'Tiếng Việt', note: undefined },
  ]);
});

test('LANGS and LANG_LABELS stay in step', () => {
  assert.deepEqual(LANGS, ['en', 'vi']);
  assert.deepEqual(Object.keys(LANG_LABELS).sort(), [...LANGS].sort());
});

test('topicsOf collapses an EN/VI pair into one group, one entry per language note', () => {
  const en = note('how-i-use-openmaus/openmaus-explained-en');
  const vi = note('how-i-use-openmaus/openmaus-explained-vi');
  assert.deepEqual(topicsOf([en, vi]), [[en, vi]]);
});

test('topicsOf keeps an untagged, translationless note as its own one-member group', () => {
  const solo = note('me/the-joy-of-malleable-products');
  assert.deepEqual(topicsOf([solo]), [[solo]]);
});

test('topicsOf orders each topic by where its first-seen member appeared, not by language', () => {
  const vi = note('how-i-use-openmaus/openmaus-explained-vi');
  const en = note('how-i-use-openmaus/openmaus-explained-en');
  const solo = note('me/the-joy-of-malleable-products');
  assert.deepEqual(topicsOf([solo, vi, en]), [[solo], [vi, en]]);
});

test('topicsOf returns one group per topic for several unrelated notes', () => {
  const a = note('how-i-use-openmaus/openmaus-explained-en');
  const b = note('how-i-use-openmaus/other-note-en');
  assert.deepEqual(topicsOf([a, b]), [[a], [b]]);
});
