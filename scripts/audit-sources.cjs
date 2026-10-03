#!/usr/bin/env node
const fs = require('node:fs');
const { RSS_FEEDS, fetchConfiguredFeed } = require('../server/data-feeds.cjs');
const { parseConfiguredSource } = require('../server/source-adapters.cjs');
const { filterRecentItems } = require('../server/rss.cjs');
const { isPromotionalEntry, isFinanceEntry, sourceKind } = require('../shared/source-policy.js');

async function auditFeed(category, feed) {
  const started = Date.now();
  try {
    const { data, status } = await fetchConfiguredFeed(feed, { timeout: 15000,
      accept: feed.parser === 'scientist-publications' && feed.provider !== 'arxiv' ? 'application/json' : '*/*' });
    const parsed = parseConfiguredSource(data, feed);
    const eligible = filterRecentItems(parsed, { maxAgeMs: feed.maxAgeMs })
      .filter(item => !isPromotionalEntry(item) && (!feed.filter || feed.filter(item))
        && (category !== 'finance' || isFinanceEntry(item)));
    const newest = parsed.filter(x => x.pubDate && Number.isFinite(+x.pubDate) && +x.pubDate <= Date.now()).sort((a, b) => b.pubDate - a.pubDate)[0];
    const health = eligible.length ? 'OK' : sourceKind(feed.name) === 'author' ? 'NO_RECENT_PUBLICATIONS'
      : parsed.length ? 'NO_RECENT_ITEMS' : ['legistar', 'wmata'].includes(feed.parser) ? 'NO_ENTRIES' : 'INVALID_RESPONSE';
    return { category, name: feed.name, url: feed.url, health, http: status, parsed: parsed.length,
      eligible: eligible.length, windowDays: feed.maxAgeMs / 86400000, newest: newest?.pubDate.toISOString() || null,
      newestDays: newest ? (Date.now() - newest.pubDate) / 86400000 : null,
      durationMs: Date.now() - started, samples: eligible.slice(0, 3).map(x => ({ title: x.title, link: x.link })) };
  } catch (error) {
    return { category, name: feed.name, url: feed.url, health: 'UNAVAILABLE', error: error.message, durationMs: Date.now() - started };
  }
}

async function main() {
  const byUrl = new Map();
  for (const [category, feeds] of Object.entries(RSS_FEEDS)) for (const feed of feeds) {
    if (!byUrl.has(feed.url)) byUrl.set(feed.url, { category, feed });
  }
  const unique = [...byUrl.values()];
  const results = [];
  async function workers(entries, count, gap = 0) {
    let next = 0;
    await Promise.all(Array.from({ length: count }, async () => {
      while (next < entries.length) {
        const { category, feed } = entries[next++];
        results.push(await auditFeed(category, feed));
        if (gap && next < entries.length) await new Promise(resolve => setTimeout(resolve, gap));
      }
    }));
  }
  await Promise.all([
    workers(unique.filter(x => !['arxiv', 'crossref'].includes(x.feed.provider)), 6),
    workers(unique.filter(x => x.feed.provider === 'arxiv'), 1, 3100),
    workers(unique.filter(x => x.feed.provider === 'crossref'), 1, 1500),
  ]);
  results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  console.table(results.map(x => ({ Type: x.category, Source: x.name, Health: x.health, HTTP: x.http || '-', Parsed: x.parsed ?? '-',
    Eligible: x.eligible ?? '-', 'Window days': x.windowDays ?? '-', 'Newest days': x.newestDays == null ? '-' : x.newestDays.toFixed(1) })));
  const output = process.argv.find(x => x.startsWith('--json='))?.slice(7);
  if (output) fs.writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  const failures = results.filter(x => ['UNAVAILABLE', 'INVALID_RESPONSE'].includes(x.health));
  for (const x of failures) console.error(`${x.name}: ${x.error || x.health}`);
  console.log(`${results.length} distinct endpoints checked; ${failures.length} delivery/parser failures. Quiet publication monitors are not classified as inactive researchers.`);
  if (failures.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
