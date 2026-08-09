const assert = require('node:assert/strict');
const test = require('node:test');
const { RSS_FEEDS, selectLocalItems } = require('../server/data-feeds.cjs');

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
