const assert = require('node:assert/strict');
const test = require('node:test');
const { RSS_FEEDS, selectScienceItems } = require('../server/data-feeds.cjs');

const NEWS_OUTLETS = [
  'ScienceDaily',
  'Phys.org',
  'Science News',
  'Live Science',
  'Quanta Magazine',
  'NASA',
  'AAAS Science News',
  'APS Psychology',
  'Neuroscience News Psychology',
];

const JOURNALS = [
  'Nature',
  'Science',
  'PNAS',
  'Cell',
  'Science Advances',
  'eLife',
  'PLOS ONE',
  'The Lancet',
  'NEJM',
  'Frontiers in Psychology',
  'Human Factors',
  'Ergonomics',
  'Carbon Brief',
  'Mongabay',
  'STAT',
  'WHO',
  'Undark',
  'USGS Earthquakes',
];

test('configures a distinct mix of science reporting and primary journals', () => {
  const feeds = RSS_FEEDS.science;
  const names = feeds.map(feed => feed.name);
  const urls = feeds.map(feed => feed.url);

  assert.deepEqual(names, [...NEWS_OUTLETS, ...JOURNALS]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every(url => new URL(url).protocol === 'https:'));
});

test('applies science source selection before response limits', () => {
  const otherItems = Array.from({ length: 60 }, (_, index) => ({
    id: `other-${index}`,
    title: `Other article ${index}`,
    source: 'ScienceDaily',
  }));
  const selectedItems = Array.from({ length: 3 }, (_, index) => ({
    id: `nature-${index}`,
    title: `Nature article ${index}`,
    source: 'Nature',
  }));

  const result = selectScienceItems(
    [...otherItems, ...selectedItems],
    new Set(['Nature'])
  );

  assert.deepEqual(result, selectedItems);
  assert.deepEqual(selectScienceItems([...otherItems], new Set()), []);
});

test('reserves room for slower journal feeds in the default science mix', () => {
  const prolificOutlet = Array.from({ length: 60 }, (_, index) => ({
    id: `daily-${index}`,
    title: `Daily article ${index}`,
    source: 'ScienceDaily',
  }));
  const journalItems = JOURNALS.map((source, index) => ({
    id: `journal-${index}`,
    title: `${source} research article`,
    source,
  }));

  const result = selectScienceItems([...prolificOutlet, ...journalItems]);
  const resultSources = new Set(result.map(item => item.source));

  assert.equal(result.length, 60);
  assert.ok(JOURNALS.every(source => resultSources.has(source)));
});

test('filters journal housekeeping notices while retaining research articles', () => {
  const nature = RSS_FEEDS.science.find(feed => feed.name === 'Nature');
  const pnas = RSS_FEEDS.science.find(feed => feed.name === 'PNAS');
  const plos = RSS_FEEDS.science.find(feed => feed.name === 'PLOS ONE');

  assert.equal(nature.filter({ title: 'Publisher Correction: an article' }), false);
  assert.equal(nature.filter({ title: 'A new result in quantum sensing' }), true);
  assert.equal(pnas.filter({ title: 'In This Issue' }), false);
  assert.equal(pnas.filter({ title: 'An ecological research article' }), true);
  assert.equal(plos.filter({ title: 'Retraction: an article' }), false);
  assert.equal(plos.filter({ title: 'A genomics research article' }), true);
});
