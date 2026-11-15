// Draft noindex is a privacy requirement, not an SEO regression to remove.
module.exports.assertionsForPage = function ({ isDraft, noIndex }) {
  if (noIndex && !isDraft) throw new Error('Unexpected noindex on a non-draft page');
  if (isDraft && !noIndex) throw new Error('Draft note must remain noindex');
  const assertions = {
    'categories:performance': ['error', { minScore: 0.98, aggregationMethod: 'median-run' }],
    'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
  };
  if (noIndex) assertions['is-crawlable'] = ['error', { minScore: 0, maxScore: 0, aggregationMethod: 'median-run' }];
  else assertions['categories:seo'] = ['error', { minScore: 0.95, aggregationMethod: 'median-run' }];
  return assertions;
};
