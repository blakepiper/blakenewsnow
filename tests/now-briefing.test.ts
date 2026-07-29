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

test('fills all six briefing cells when a filter page has enough reports', () => {
  const items = [
    item('one', 'Central bank announces revised lending guidance', 'Source A', 1),
    item('two', 'Parliament opens debate on national housing bill', 'Source B', 2),
    item('three', 'Researchers publish new battery efficiency results', 'Source C', 3),
    item('four', 'Shipping companies reroute vessels after port closure', 'Source D', 4),
    item('five', 'Health agency expands seasonal vaccine program', 'Source E', 5),
    item('six', 'Regional rail operator unveils overnight service', 'Source F', 6),
    item('seven', 'Court schedules hearing in antitrust challenge', 'Source G', 7),
  ];

  const briefing = buildNowBriefing(items, { now: NOW });

  assert.equal(briefing.clusters.length, 6);
  assert.equal(new Set(briefing.clusters.map(cluster => cluster.link)).size, 6);
});

test('counts syndicated copies as one independent report', () => {
  const reutersLead = 'WASHINGTON (Reuters) - The president signed the national housing reform bill into law after a congressional vote.';
  const items = [
    {
      ...item('wire-one', 'President signs national housing reform bill into law', 'Outlet A', 1),
      description: reutersLead,
    },
    {
      ...item('wire-two', 'National housing reform bill signed into law by president', 'Outlet B', 1.2),
      description: `${reutersLead} The measure takes effect next year.`,
    },
    {
      ...item('wire-three', 'President signs sweeping national housing reform into law', 'Outlet C', 1.4),
      description: reutersLead,
    },
    {
      ...item('original', 'President signs national housing reform law after congressional vote', 'Outlet D', 1.6),
      description: 'The legislation changes zoning incentives and creates a grant program for local governments.',
    },
  ];

  const briefing = buildNowBriefing(items, { now: NOW, maxClusters: 1 });
  const cluster = briefing.clusters[0];

  assert.equal(cluster.itemCount, 4);
  assert.equal(cluster.publisherCount, 4);
  assert.equal(cluster.independentReportCount, 2);
  assert.equal(cluster.coverage, 'multi-source');
});

test('does not use syndicated copies to pad the six-cell briefing', () => {
  const copiedLead = 'LONDON (Reuters) - Regulators approved the international shipping merger following a yearlong review.';
  const items = [
    {
      ...item('copy-one', 'Regulators approve international shipping merger', 'Outlet A', 1),
      description: copiedLead,
    },
    {
      ...item('copy-two', 'International shipping merger wins approval from regulators', 'Outlet B', 1.1),
      description: copiedLead,
    },
    item('distinct-one', 'Central bank announces revised lending guidance', 'Source C', 2),
    item('distinct-two', 'Parliament opens debate on national housing bill', 'Source D', 3),
    item('distinct-three', 'Researchers publish new battery efficiency results', 'Source E', 4),
    item('distinct-four', 'Health agency expands seasonal vaccine program', 'Source F', 5),
    item('distinct-five', 'Regional rail operator unveils overnight service', 'Source G', 6),
  ];

  const briefing = buildNowBriefing(items, { now: NOW });
  const syndicatedCells = briefing.clusters.filter(cluster =>
    /shipping merger/i.test(cluster.headline)
  );

  assert.equal(briefing.clusters.length, 6);
  assert.equal(syndicatedCells.length, 1);
});

test('keeps the 180-item local briefing pass comfortably bounded', () => {
  const items = Array.from({ length: 180 }, (_, index) => item(
    `load-${index}`,
    `Regional council approves emergency transit funding package ${index}`,
    `Source ${index}`,
    index / 20
  ));
  const started = performance.now();

  const briefing = buildNowBriefing(items, { now: NOW });
  const elapsed = performance.now() - started;

  assert.equal(briefing.analyzedCount, 180);
  assert.ok(elapsed < 150, `expected briefing build below 150ms, received ${elapsed.toFixed(1)}ms`);
});

test('excludes stale, future, and invalid reports while grouping cross-publisher duplicates', () => {
  const valid = item('valid', 'Transit workers approve tentative contract', 'Source A', 1);
  const duplicate = { ...valid, id: 'duplicate', source: 'Source B' };
  const stale = item('stale', 'A very old headline', 'Source C', 48);
  const future = item('future', 'A headline from the future', 'Source D', -2);
  const invalid = { ...item('invalid', 'A report without a link', 'Source E', 1), link: '' };

  const briefing = buildNowBriefing(
    [valid, duplicate, stale, future, invalid],
    { now: NOW, windowHours: 36 }
  );

  assert.equal(briefing.analyzedCount, 2);
  assert.equal(briefing.clusters.length, 1);
  assert.equal(briefing.clusters[0].headline, valid.title);
  assert.equal(briefing.clusters[0].publisherCount, 2);
  assert.equal(briefing.clusters[0].independentReportCount, 1);
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
