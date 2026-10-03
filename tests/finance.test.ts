import assert from 'node:assert/strict';
import test from 'node:test';
import { getFinanceTopics, matchesFinanceFilter } from '../src/utils/finance.ts';
import { DEFAULT_SETTINGS, loadSettings } from '../src/stores/settings.ts';
import { getSourceCategory, getCategoryDotColor } from '../src/utils/formatters.ts';
import type { FeedItem } from '../src/types.ts';
import { createRequire } from 'node:module';

const { RSS_FEEDS } = createRequire(import.meta.url)('../server/data-feeds.cjs');

function item(title: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'test', title, source: 'NPR', sourceType: 'news', category: 'NPR',
    timestamp: new Date().toISOString(), link: 'https://example.com/story',
    ...overrides,
  };
}

test('includes stocks, IPOs, crypto, trade, and macro reporting from general and tech feeds', () => {
  const cases = [
    ['Wall Street stocks slide after earnings', 'stocks'],
    ['Startup files for an initial public offering', 'ipos'],
    ['Bitcoin jumps as stablecoin rules change', 'crypto'],
    ['New import duties escalate the trade war', 'trade'],
    ['Bank of Japan changes interest rates', 'macro'],
  ] as const;
  for (const [title, topic] of cases) {
    assert.equal(matchesFinanceFilter(item(title), topic), true);
    assert.equal(matchesFinanceFilter(item(title), 'all'), true);
  }
  assert.equal(matchesFinanceFilter(item('Startup goes public', { sourceType: 'tech' }), 'ipos'), true);
  assert.equal(matchesFinanceFilter(item('The latest update', { description: 'A slowdown in the global economy.' }), 'macro'), true);
});

test('allows several finance topics for the same story', () => {
  const report = item('Stocks fall as tariffs push inflation higher');
  assert.deepEqual(getFinanceTopics(report), ['stocks', 'trade', 'macro']);
  assert.equal(matchesFinanceFilter(report, 'ipos'), false);
});

test('keeps source-specific coverage even when headlines do not contain topic keywords', () => {
  for (const [source, topic] of [
    ['CNBC IPOs', 'ipos'], ['CoinDesk', 'crypto'], ['WTO News', 'trade'], ['ECB', 'macro'],
  ] as const) {
    assert.equal(matchesFinanceFilter(item('New developments today', { source, sourceType: 'finance' }), topic), true);
  }
  assert.equal(matchesFinanceFilter(item('Company explores a merger', { sourceType: 'finance' })), true);
});

test('excludes unrelated stories and social discussion from Finance', () => {
  assert.equal(matchesFinanceFilter(item('Voters share their views at a campaign rally')), false);
  assert.equal(matchesFinanceFilter(item('Museum announces its public opening')), false);
  assert.equal(matchesFinanceFilter(item('Museum announces its public opening', { source: 'Financial Times', sourceType: 'finance' })), false);
  assert.equal(matchesFinanceFilter(item('China launches anti-dumping probe into chemical exports'), 'trade'), true);
  for (const sourceType of ['social', 'science', 'local'] as const) {
    assert.equal(matchesFinanceFilter(item('Bitcoin and stock prices', { sourceType })), false);
  }
});

test('all finance adapters have individually selectable, consistently categorized sources', () => {
  const sources = DEFAULT_SETTINGS.sources.filter(source => source.category === 'finance');
  assert.deepEqual(sources.map(source => source.name).sort(), RSS_FEEDS.finance.map((feed: { name: string }) => feed.name).sort());
  for (const source of sources) {
    assert.equal(source.enabled, true);
    assert.equal(getSourceCategory(source.name), 'finance');
  }
  assert.equal(getCategoryDotColor('finance'), 'bg-amber-400');
});

test('migrates finance categories while preserving saved publisher toggles and priorities', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify({
      sources: [{ id: 'bloomberg', name: 'Bloomberg', category: 'news', enabled: false, priority: 4 }],
    }) },
  });
  try {
    const settings = loadSettings();
    const bloomberg = settings.sources.find(source => source.id === 'bloomberg');
    assert.equal(bloomberg?.category, 'finance');
    assert.equal(bloomberg?.enabled, false);
    assert.equal(bloomberg?.priority, 4);
    assert.equal(settings.sources.find(source => source.id === 'coindesk')?.enabled, true);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
