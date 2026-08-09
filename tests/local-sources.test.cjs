const assert = require('node:assert/strict');
const test = require('node:test');
const { isWtopBettingPromotion, RSS_FEEDS, selectLocalItems } = require('../server/data-feeds.cjs');

test('configures free DC and Alexandria local sources', () => {
  const feeds = RSS_FEEDS.local;
  assert.ok(feeds.some(feed => feed.name === 'Alexandria City'));
  assert.ok(feeds.some(feed => feed.name === 'Alexandria Times'));
  assert.ok(feeds.some(feed => feed.name === 'WTOP'));
  assert.ok(feeds.some(feed => feed.name === 'WAMU'));
  assert.ok(feeds.every(feed => new URL(feed.url).protocol === 'https:'));
});

test('applies local source selection before the response limit', () => {
  const items = [
    ...Array.from({ length: 50 }, (_, index) => ({ source: 'WTOP', id: `wtop-${index}` })),
    { source: 'Alexandria Times', id: 'alexandria-1' },
  ];
  assert.deepEqual(
    selectLocalItems(items, new Set(['Alexandria Times'])),
    [{ source: 'Alexandria Times', id: 'alexandria-1' }]
  );
});

test('filters WTOP betting and prediction-market promotions while keeping local reporting', () => {
  assert.equal(isWtopBettingPromotion({
    title: 'BetMGM Bonus Code TOP1500: Get $1,500 Bonus for MLB Games',
    description: 'This article contains references to products from our advertisers or partners.',
  }), true);
  assert.equal(isWtopBettingPromotion({
    title: 'Virginia lawmakers debate sports betting regulations',
    description: 'The proposal would change how licensed operators report revenue.',
  }), false);
  assert.equal(isWtopBettingPromotion({
    title: 'DC prediction market policy draws scrutiny',
    description: 'Officials are reviewing the legal questions around the market.',
  }), false);
});
