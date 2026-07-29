const assert = require('node:assert/strict');
const test = require('node:test');
const { filterRecentItems, inferDateFromUrl, parseRSS } = require('../server/rss.cjs');

const NOW = new Date('2026-07-29T12:00:00.000Z').getTime();
const WEEK = 7 * 24 * 60 * 60 * 1000;

test('parses RSS and decodes a valid article', () => {
  const items = parseRSS(`
    <rss><channel><item>
      <title><![CDATA[News &amp; analysis]]></title>
      <link>https://example.com/2026/07/29/story?x=1&amp;y=2</link>
      <pubDate>Wed, 29 Jul 2026 11:30:00 GMT</pubDate>
      <description><![CDATA[<p>A useful summary.</p>]]></description>
    </item></channel></rss>
  `, 'Example');

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'News & analysis');
  assert.equal(items[0].link, 'https://example.com/2026/07/29/story?x=1&y=2');
  assert.equal(items[0].description, 'A useful summary.');
  assert.equal(items[0].dateSource, 'feed');
});

test('parses Atom alternate links and updated dates', () => {
  const items = parseRSS(`
    <feed>
      <entry>
        <title>Atom story</title>
        <link rel="alternate" href="https://example.com/atom-story" />
        <updated>2026-07-29T10:00:00Z</updated>
      </entry>
    </feed>
  `, 'Atom');

  assert.equal(items[0].link, 'https://example.com/atom-story');
  assert.equal(items[0].pubDate.toISOString(), '2026-07-29T10:00:00.000Z');
});

test('never promotes an undated item to the current time', () => {
  const [item] = parseRSS(`
    <rss><channel><item>
      <title>Undated legacy story</title>
      <link>https://example.com/archive/story</link>
    </item></channel></rss>
  `, 'Legacy');

  assert.equal(item.pubDate, null);
  assert.deepEqual(filterRecentItems([item], { maxAgeMs: WEEK, now: NOW }), []);
});

test('infers dates from common article URLs, then applies freshness', () => {
  const date = inferDateFromUrl('https://www.cnn.com/2023/04/18/opinions/old-story');
  assert.equal(date.toISOString(), '2023-04-18T12:00:00.000Z');

  const [item] = parseRSS(`
    <rss><channel><item>
      <title>The 2024 presidential alternative many voters will want</title>
      <link>https://www.cnn.com/2023/04/18/opinions/old-story</link>
    </item></channel></rss>
  `, 'CNN');

  assert.equal(item.dateSource, 'url');
  assert.deepEqual(filterRecentItems([item], { maxAgeMs: WEEK, now: NOW }), []);
});

test('drops future timestamps and non-http links', () => {
  const items = [
    { pubDate: new Date(NOW + 60 * 60 * 1000), link: 'https://example.com/future' },
    { pubDate: new Date(NOW), link: 'javascript:alert(1)' },
  ];

  assert.deepEqual(filterRecentItems(items, { maxAgeMs: WEEK, now: NOW }), []);
});
