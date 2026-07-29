import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findReadableArticleRecommendation,
  type ArticlePreviewDocument,
} from '../src/ml/articleRecommendations.ts';
import type { FeedItem } from '../src/types.ts';

const NOW = Date.parse('2026-07-29T16:00:00Z');

function item(id: string, title: string, source: string, hoursAgo: number): FeedItem {
  return {
    id,
    title,
    source,
    sourceType: 'news',
    category: source,
    timestamp: new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString(),
    link: `https://${id}.example/story`,
  };
}

function preview(extractionMode: ArticlePreviewDocument['extractionMode']): ArticlePreviewDocument {
  return {
    title: 'Readable report',
    byline: '',
    siteName: 'Example',
    excerpt: '',
    publishedTime: '',
    length: extractionMode === 'article' ? 2_000 : 100,
    paragraphs: extractionMode === 'article' ? ['Full text paragraph.'] : ['Short excerpt.'],
    requestedUrl: 'https://example.com/story',
    finalUrl: 'https://example.com/story',
    cached: false,
    extractionMode,
  };
}

test('recommends the strongest related report verified to have full text', async () => {
  const target = item(
    'blocked',
    'Senate approves emergency coastal flood funding package',
    'Blocked Publisher',
    1
  );
  const strongest = item(
    'strongest',
    'Senate approves coastal flood emergency funding package',
    'Excerpt Publisher',
    1.2
  );
  const readable = item(
    'readable',
    'Emergency coastal flood funding package approved by Senate',
    'Readable Publisher',
    1.5
  );
  const unrelated = item(
    'unrelated',
    'Central bank leaves benchmark interest rate unchanged',
    'Other Publisher',
    1
  );
  const attempted: string[] = [];

  const recommendation = await findReadableArticleRecommendation(
    target,
    [strongest, readable, unrelated],
    async candidate => {
      attempted.push(candidate.id);
      return preview(candidate.id === readable.id ? 'article' : 'metadata');
    }
  );

  assert.equal(recommendation?.item.id, readable.id);
  assert.equal(recommendation?.preview.extractionMode, 'article');
  assert.ok(recommendation?.sharedTerms.includes('coastal'));
  assert.deepEqual(attempted.sort(), [readable.id, strongest.id].sort());
});

test('does not offer unverified, unrelated, or failed recommendations', async () => {
  const target = item(
    'blocked',
    'Researchers publish new battery efficiency findings',
    'Blocked Publisher',
    1
  );
  const related = item(
    'related',
    'New battery efficiency findings published by researchers',
    'Unavailable Publisher',
    2
  );
  const unrelated = item(
    'unrelated',
    'City council schedules downtown zoning vote',
    'Other Publisher',
    2
  );
  let attempts = 0;

  const recommendation = await findReadableArticleRecommendation(
    target,
    [related, unrelated],
    async () => {
      attempts += 1;
      throw new Error('Publisher refused the preview request');
    }
  );

  assert.equal(recommendation, null);
  assert.equal(attempts, 1);
});

test('skips network verification when local similarity finds no same-event report', async () => {
  const target = item(
    'blocked',
    'Volcano evacuation order expanded near coastal villages',
    'Blocked Publisher',
    1
  );
  const unrelated = item(
    'unrelated',
    'Technology shares lift major stock indexes',
    'Other Publisher',
    1
  );
  let attempts = 0;

  const recommendation = await findReadableArticleRecommendation(
    target,
    [unrelated],
    async () => {
      attempts += 1;
      return preview('article');
    }
  );

  assert.equal(recommendation, null);
  assert.equal(attempts, 0);
});
