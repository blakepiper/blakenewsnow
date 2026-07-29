import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNowBriefing, findRelatedFeedItems } from '../src/ml/nowBriefing.ts';
import type { FeedItem } from '../src/types.ts';

const NOW = Date.parse('2026-07-29T12:00:00Z');

function item(
  id: string,
  title: string,
  source: string,
  hoursAgo: number,
  sourceType: FeedItem['sourceType'] = 'news'
): FeedItem {
  return {
    id,
    title,
    source,
    sourceType,
    category: source,
    timestamp: new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString(),
    link: `https://example.com/${id}`,
  };
}

test('clusters related reporting and ranks independent source agreement first', () => {
  const items = [
    item('iran-1', 'Iran launches missiles at American forces in Gulf', 'Source A', 1),
    item('iran-2', 'American forces intercept missiles launched by Iran', 'Source B', 2),
    item('iran-3', 'Iran missile launch targets American forces, military says', 'Source C', 3),
    item('senate-1', 'Senate panel advances new privacy bill', 'Source A', 1),
    item('senate-2', 'New privacy bill advances through Senate panel', 'Source B', 2),
    item('books', 'The best novels published this summer', '/lit/', 1, 'social'),
  ];

  const briefing = buildNowBriefing(items, { now: NOW, maxClusters: 3 });

  assert.equal(briefing.clusters[0].itemCount, 3);
  assert.equal(briefing.clusters[0].sources.length, 3);
  assert.equal(briefing.clusters[0].coverage, 'multi-source');
  assert.match(briefing.clusters[0].headline, /Iran|missiles|American forces/i);
});

test('uses only real headlines and links in the extractive briefing', () => {
  const items = [
    item('one', 'Court hears challenge to federal climate rule', 'Source A', 1),
    item('two', 'Federal climate rule faces challenge before court', 'Source B', 2),
  ];

  const briefing = buildNowBriefing(items, { now: NOW });
  const inputHeadlines = new Set(items.map(entry => entry.title));
  const inputLinks = new Set(items.map(entry => entry.link));

  briefing.clusters.forEach(cluster => {
    assert.ok(inputHeadlines.has(cluster.headline));
    assert.ok(inputLinks.has(cluster.link));
    cluster.supporting.forEach(supporting => {
      assert.ok(inputHeadlines.has(supporting.headline));
      assert.ok(inputLinks.has(supporting.link));
    });
  });
});

test('excludes stale, future, invalid, and duplicate reports', () => {
  const valid = item('valid', 'Transit workers approve tentative contract', 'Source A', 1);
  const duplicate = { ...valid, id: 'duplicate', source: 'Source B' };
  const stale = item('stale', 'A very old headline', 'Source C', 48);
  const future = item('future', 'A headline from the future', 'Source D', -2);
  const invalid = { ...item('invalid', 'A report without a link', 'Source E', 1), link: '' };

  const briefing = buildNowBriefing(
    [valid, duplicate, stale, future, invalid],
    { now: NOW, windowHours: 36 }
  );

  assert.equal(briefing.analyzedCount, 1);
  assert.equal(briefing.clusters.length, 1);
  assert.equal(briefing.clusters[0].headline, valid.title);
});

test('does not join unrelated stories on generic news phrases alone', () => {
  const items = [
    item('markets', 'FTSE 100 hits record high despite technology sell-off', 'Source A', 1),
    item('survey', 'Record high say voters dislike the proposed tax plan', 'Source B', 1),
  ];

  const briefing = buildNowBriefing(items, { now: NOW });

  assert.equal(briefing.clusters.length, 2);
  assert.ok(briefing.clusters.every(cluster => cluster.itemCount === 1));
});

test('finds same-event coverage from a different publisher without broad-topic matches', () => {
  const target = item(
    'target',
    'Anthony Fauci invokes fifth amendment during Senate Covid origins hearing',
    'Blocked Source',
    1
  );
  const matching = item(
    'matching',
    'Fauci invokes the Fifth Amendment at Senate hearing on Covid origins',
    'Accessible Source',
    2
  );
  const unrelated = item(
    'unrelated',
    'Senate advances privacy legislation during a late hearing',
    'Other Source',
    2
  );
  const samePublisher = item(
    'same',
    'Fauci invokes fifth amendment in Covid hearing',
    'Blocked Source',
    2
  );

  const related = findRelatedFeedItems(target, [matching, unrelated, samePublisher]);

  assert.equal(related.length, 1);
  assert.equal(related[0].item.id, matching.id);
  assert.ok(related[0].sharedTerms.includes('fauci'));
});

test('does not treat generic market phrasing as an alternate version', () => {
  const target = item(
    'target',
    'FTSE 100 hits record high despite technology sell-off',
    'Blocked Source',
    1
  );
  const unrelated = item(
    'unrelated',
    'Record high say voters dislike the proposed tax plan',
    'Accessible Source',
    1
  );

  assert.deepEqual(findRelatedFeedItems(target, [unrelated]), []);
});
