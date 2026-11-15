import test from 'node:test';
import assert from 'node:assert/strict';
import policy from '../../scripts/lighthouse-policy.cjs';

test('public Lighthouse floors remain unchanged and unexpected noindex refuses collection', () => {
  const assertions = policy.assertionsForPage({ isDraft: false, noIndex: false });
  assert.equal(assertions['categories:performance'][1].minScore, 0.98);
  assert.equal(assertions['categories:accessibility'][1].minScore, 0.95);
  assert.equal(assertions['categories:seo'][1].minScore, 0.95);
  assert.throws(() => policy.assertionsForPage({ isDraft: false, noIndex: true }), /Unexpected noindex/);
});
test('intentional draft keeps performance/accessibility floors and must remain noncrawlable', () => {
  const assertions = policy.assertionsForPage({ isDraft: true, noIndex: true });
  assert.equal(assertions['categories:performance'][1].minScore, 0.98);
  assert.equal(assertions['categories:accessibility'][1].minScore, 0.95);
  assert.equal(assertions['is-crawlable'][1].maxScore, 0);
  assert.equal(assertions['categories:seo'], undefined);
  assert.throws(() => policy.assertionsForPage({ isDraft: true, noIndex: false }), /Draft note must remain noindex/);
});
