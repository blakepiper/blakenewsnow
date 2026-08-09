#!/usr/bin/env node

const { RSS_FEEDS } = require('../server/data-feeds.cjs');
const { filterRecentItems, parseAlexandriaNews, parseRSS } = require('../server/rss.cjs');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const TIMEOUT_MS = 15000;

async function auditFeed(category, feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  try {
    const response = await fetch(feed.url, {
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'User-Agent': 'Mozilla/5.0',
        ...feed.headers,
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const xml = await response.text();
    const parsed = feed.parser === 'alexandria-html'
      ? parseAlexandriaNews(xml, feed.name, feed.url)
      : parseRSS(xml, feed.name);
    const current = filterRecentItems(parsed, { maxAgeMs: feed.maxAgeMs || 7 * DAY });
    const recent48h = filterRecentItems(parsed, { maxAgeMs: 2 * DAY });
    const filtered = feed.filter ? current.filter(feed.filter) : current;
    const filtered48h = feed.filter ? recent48h.filter(feed.filter) : recent48h;
    const newest = current.reduce(
      (latest, item) => Math.max(latest, item.pubDate?.getTime() || 0),
      0
    );
    const descriptions = filtered.filter(item => item.description).length;
    const status = !response.ok || parsed.length === 0
      ? 'FAIL'
      : filtered.length === 0 || !newest || Date.now() - newest > (feed.maxAgeMs || 7 * DAY)
        ? 'STALE'
        : 'OK';

    return {
      category,
      name: feed.name,
      status,
      http: response.status,
      parsed: parsed.length,
      current: filtered.length,
      recent48h: filtered48h.length,
      newestHours: newest ? (Date.now() - newest) / HOUR : null,
      descriptions: filtered.length ? Math.round((descriptions / filtered.length) * 100) : 0,
      durationMs: Date.now() - started,
      error: '',
    };
  } catch (error) {
    return {
      category,
      name: feed.name,
      status: 'FAIL',
      http: '-',
      parsed: 0,
      current: 0,
      recent48h: 0,
      newestHours: null,
      descriptions: 0,
      durationMs: Date.now() - started,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const uniqueFeeds = [];
  const seenUrls = new Set();
  for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
    for (const feed of feeds) {
      if (seenUrls.has(feed.url)) continue;
      seenUrls.add(feed.url);
      uniqueFeeds.push({ category, feed });
    }
  }

  const results = await Promise.all(
    uniqueFeeds.map(({ category, feed }) => auditFeed(category, feed))
  );

  console.table(results.map(result => ({
    Type: result.category,
    Source: result.name,
    Health: result.status,
    HTTP: result.http,
    Parsed: result.parsed,
    '7d': result.current,
    '48h': result.recent48h,
    'Newest h': result.newestHours == null ? '-' : result.newestHours.toFixed(1),
    'Desc %': result.descriptions,
    'Time ms': result.durationMs,
  })));

  const unhealthy = results.filter(result => result.status !== 'OK');
  if (unhealthy.length) {
    for (const result of unhealthy) {
      console.error(`${result.status}: ${result.name}${result.error ? ` — ${result.error}` : ''}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`All ${results.length} unique RSS/Atom sources are current and parseable.`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
