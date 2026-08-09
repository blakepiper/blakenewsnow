/**
 * BlakeNewsNow Data Feeds
 * Fetches headlines from RSS and financial data from Yahoo/CoinGecko
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { filterRecentItems, parseAlexandriaNews, parseRSS } = require('./rss.cjs');

function stableId(prefix, title, source) {
  const hash = crypto.createHash('md5').update(`${source}:${title}`).digest('hex').slice(0, 10);
  return `${prefix}-${hash}`;
}

function selectDiverseItems(items, limit, perSourceCap) {
  const selected = [];
  const deferred = [];
  const sourceCounts = new Map();

  for (const item of items) {
    const count = sourceCounts.get(item.source) || 0;
    if (count < perSourceCap && selected.length < limit) {
      selected.push(item);
      sourceCounts.set(item.source, count + 1);
    } else {
      deferred.push(item);
    }
  }

  if (selected.length < limit) {
    selected.push(...deferred.slice(0, limit - selected.length));
  }
  return selected.slice(0, limit);
}

const LOCAL_BETTING_TERMS = /\b(?:betmgm|prophetx|kalshi|polymarket|draftkings|fanduel|bet365|caesars(?: sportsbook)?|fanatics sportsbook|sportsbook|sports betting|prediction markets?|betting odds|parlay|wager|jackpot)\b/i;
const LOCAL_ADULT_TERMS = /\b(?:cam sites?|camgirls?|webcam models?|adult (?:sites?|content|entertainment)|porn(?:ographic)?|onlyfans|xxx sites?|live sex|trans cams?)\b/i;
const LOCAL_PROMOTION_MARKERS = /\b(?:promo(?:tion)? code|bonus code|bonus bets?|promo bets?|sign[- ]?up bonus|exclusive offer|advertis(?:er|ing)|sponsored(?: content)?|affiliate|products from our advertisers|partners?|coupon|discount code|free spins|claim(?:ing)? \$?[\d,]+|get \$?[\d,]+)\b/i;
const LOCAL_COMMERCIAL_LISTICLE = /\b(?:top|best)\s+\d+\b[\s\S]{0,80}\b(?:sites?|platforms?|services?|apps?|products?)\b/i;

function isLocalAdOrPromotion(item) {
  const title = String(item?.title || '');
  const description = String(item?.description || '');
  const text = `${title} ${description}`;

  if (LOCAL_ADULT_TERMS.test(text) || LOCAL_COMMERCIAL_LISTICLE.test(title)) return true;
  if (/\b(?:sponsored(?: content)?|affiliate|advertiser(?:s)?|products from our advertisers|our partners?)\b/i.test(text)) return true;
  if (LOCAL_PROMOTION_MARKERS.test(text)) return true;
  return LOCAL_BETTING_TERMS.test(title) && /\b(?:code|bonus|offer|promo|claim|get)\b/i.test(title);
}

const localFeedFilter = item => !isLocalAdOrPromotion(item);

// ============================================
// RSS Feed Configuration
// ============================================
const RSS_FEEDS = {
  headlines: [
    { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'CBC News', url: 'https://www.cbc.ca/cmlink/rss-world' },
    { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-top' },
    { name: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories' },
    { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
    { name: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
    { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' },
    { name: 'Financial Times', url: 'https://www.ft.com/rss/home' },
    { name: 'Wall Street Journal', url: 'https://feeds.content.dowjones.io/public/rss/RSSWorldNews' },
    { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines' },
    { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/news' },
    { name: 'Axios', url: 'https://api.axios.com/feed/' },
    { name: 'The Hill', url: 'https://thehill.com/feed/' },
    { name: 'Vox', url: 'https://www.vox.com/rss/index.xml' },
    { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/us.xml' },
    { name: 'Politico', url: 'https://rss.politico.com/congress.xml' },
    { name: 'Semafor', url: 'https://www.semafor.com/rss.xml' },
    { name: 'The Intercept', url: 'https://theintercept.com/feed/' },
    { name: 'ProPublica', url: 'https://feeds.propublica.org/propublica/main' },
    { name: 'Foreign Policy', url: 'https://foreignpolicy.com/feed/' },
    { name: 'Breitbart', url: 'https://feeds.feedburner.com/breitbart' },
    // Free international and regional reporting
    { name: 'RFI', url: 'https://www.rfi.fr/en/rss' },
    { name: 'The Hindu', url: 'https://www.thehindu.com/feeder/default.rss' },
    { name: 'Indian Express', url: 'https://indianexpress.com/feed/' },
    { name: 'SCMP', url: 'https://www.scmp.com/rss/91/feed' },
    { name: 'El Pais', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada' },
    { name: 'Euronews', url: 'https://feeds.feedburner.com/euronews/en/news' },
    { name: 'The New Humanitarian', url: 'https://www.thenewhumanitarian.org/rss.xml', maxAgeMs: 90 * 24 * 60 * 60 * 1000 },
    { name: 'African Arguments', url: 'https://africanarguments.org/feed/' },
    { name: 'The Conversation', url: 'https://theconversation.com/us/articles.atom' },
    // Free official and primary reporting
    { name: 'White House', url: 'https://www.whitehouse.gov/news/feed/' },
    { name: 'Defense.gov', url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=400&Site=945' },
    { name: 'Congress.gov', url: 'https://www.congress.gov/rss/most-viewed-bills.xml', maxAgeMs: 90 * 24 * 60 * 60 * 1000 },
    { name: 'CISA', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
    { name: 'NOAA', url: 'https://www.noaa.gov/rss.xml' },
    {
      name: 'SEC',
      url: 'https://www.sec.gov/rss/news/press.xml',
      nativeFetch: true,
    },
    { name: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
    {
      name: 'BLS',
      url: 'https://www.bls.gov/feed/bls_latest.rss',
      nativeFetch: true,
    },
    { name: 'EIA', url: 'https://www.eia.gov/rss/todayinenergy.xml' },
    {
      name: 'FDA Press Releases',
      url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    },
    {
      name: 'FDA Recalls',
      url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml',
    },
    { name: 'CDC Travel Notices', url: 'https://wwwnc.cdc.gov/travel/rss/notices.xml' },
    // Free verification and investigative reporting
    { name: 'FactCheck.org', url: 'https://www.factcheck.org/feed/' },
    { name: 'Snopes', url: 'https://www.snopes.com/feed/' },
    { name: 'ICIJ', url: 'https://www.icij.org/feed/' },
    { name: 'Bellingcat', url: 'https://www.bellingcat.com/feed/', maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
  ],
  tech: [
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/creators/index.xml' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    {
      name: 'Wired',
      url: 'https://www.wired.com/feed/rss',
      filter: item => !/(promo codes?|coupons?|discount codes?|deals? for)/i.test(item.title),
    },
    { name: 'Lobsters', url: 'https://lobste.rs/rss' },
    { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
    {
      name: 'BleepingComputer',
      url: 'https://www.bleepingcomputer.com/feed/',
      headers: { 'User-Agent': 'BlakeNewsNow/0.4 (RSS reader)' },
    },
    { name: 'Rest of World', url: 'https://restofworld.org/feed/latest/' },
    { name: 'The Register', url: 'https://www.theregister.com/headlines.atom' },
    {
      name: '404 Media',
      url: 'https://www.404media.co/rss/',
      filter: item => !/^podcast:/i.test(item.title),
    },
    { name: 'KrebsOnSecurity', url: 'https://krebsonsecurity.com/feed/' },
    { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' },
    { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' },
    { name: 'The Markup', url: 'https://themarkup.org/feeds/rss.xml', maxAgeMs: 90 * 24 * 60 * 60 * 1000 },
    { name: 'GitHub Engineering', url: 'https://github.blog/engineering/feed/' },
    { name: 'GitHub Security', url: 'https://github.blog/security/feed/' },
    { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml' },
    { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
    { name: 'AWS News', url: 'https://aws.amazon.com/blogs/aws/feed/' },
    { name: 'Cloudflare', url: 'https://blog.cloudflare.com/rss/' },
  ],
  science: [
    // Science news and explanatory reporting
    { name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/top/science.xml' },
    { name: 'Phys.org', url: 'https://phys.org/rss-feed/' },
    { name: 'Science News', url: 'https://www.sciencenews.org/feed' },
    { name: 'Live Science', url: 'https://www.livescience.com/feeds/all' },
    { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/' },
    { name: 'NASA', url: 'https://www.nasa.gov/feed/' },
    { name: 'AAAS Science News', url: 'https://www.science.org/rss/news_current.xml' },
    { name: 'APS Psychology', url: 'https://www.psychologicalscience.org/feed' },
    {
      name: 'Neuroscience News Psychology',
      url: 'https://neurosciencenews.com/neuroscience-topics/psychology/feed/',
    },
    // Primary journals and journal publishers
    {
      name: 'Nature',
      url: 'https://www.nature.com/nature.rss',
      filter: item => !/^(author |publisher )?correction:|^retraction note:/i.test(item.title),
    },
    { name: 'Science', url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science' },
    {
      name: 'PNAS',
      url: 'https://www.pnas.org/action/showFeed?type=etoc&feed=rss&jc=pnas',
      filter: item => !/^in this issue$/i.test(item.title),
      maxAgeMs: 30 * 24 * 60 * 60 * 1000,
    },
    { name: 'Cell', url: 'https://www.cell.com/cell/current.rss' },
    { name: 'Science Advances', url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=sciadv' },
    {
      name: 'eLife',
      url: 'https://elifesciences.org/rss/recent.xml',
      headers: { 'User-Agent': 'BlakeNewsNow/0.4 (RSS reader)' },
    },
    {
      name: 'PLOS ONE',
      url: 'https://journals.plos.org/plosone/feed/atom',
      filter: item => !/^(correction|retraction|expression of concern):/i.test(item.title),
    },
    { name: 'The Lancet', url: 'https://www.thelancet.com/rssfeed/lancet_current.xml' },
    { name: 'NEJM', url: 'https://www.nejm.org/action/showFeed?type=etoc&feed=rss&jc=nejm' },
    {
      name: 'Frontiers in Psychology',
      url: 'https://www.frontiersin.org/journals/psychology/rss',
      filter: item => !/^(corrigendum|retraction|expression of concern):/i.test(item.title),
    },
    {
      name: 'Human Factors',
      url: 'https://journals.sagepub.com/action/showFeed?feed=rss&jc=hfs&type=etoc',
      filter: item => !/^(correction|retraction):/i.test(item.title),
    },
    {
      name: 'Ergonomics',
      url: 'https://www.tandfonline.com/feed/rss/terg20',
      filter: item => !/^(correction|retraction):/i.test(item.title),
    },
    // Climate, health, and earth-system reporting
    {
      name: 'Carbon Brief',
      url: 'https://www.carbonbrief.org/feed/',
      headers: { 'User-Agent': 'BlakeNewsNow/0.4 (RSS reader)' },
    },
    {
      name: 'Mongabay',
      url: 'https://news.mongabay.com/feed/',
      headers: { 'User-Agent': 'BlakeNewsNow/0.4 (RSS reader)' },
    },
    { name: 'STAT', url: 'https://www.statnews.com/feed/' },
    { name: 'WHO', url: 'https://www.who.int/rss-feeds/news-english.xml', maxAgeMs: 365 * 24 * 60 * 60 * 1000 },
    { name: 'Undark', url: 'https://undark.org/feed/' },
    { name: 'USGS Earthquakes', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.atom' },
  ],
  local: [
    { name: 'WTOP', url: 'https://wtop.com/feed/', filter: localFeedFilter },
    { name: 'WAMU', url: 'https://wamu.org/feed/', filter: localFeedFilter },
    { name: 'Alexandria City', url: 'https://www.alexandriava.gov/News', parser: 'alexandria-html', maxAgeMs: 30 * 24 * 60 * 60 * 1000, filter: localFeedFilter },
    { name: 'Alexandria Times', url: 'https://alextimes.com/feed/', filter: localFeedFilter },
    { name: 'ALXnow', url: 'https://www.alxnow.com/feed/', filter: localFeedFilter },
    { name: 'Virginia Mercury', url: 'https://www.virginiamercury.com/feed/', filter: localFeedFilter },
    { name: 'Washington Post Local', url: 'https://feeds.washingtonpost.com/rss/local', filter: localFeedFilter },
    { name: 'DC News Now', url: 'https://www.dcnewsnow.com/feed/', filter: localFeedFilter },
    { name: 'Washington City Paper', url: 'https://washingtoncitypaper.com/feed/', filter: localFeedFilter },
    { name: 'Washington Blade', url: 'https://www.washingtonblade.com/feed/', filter: localFeedFilter },
  ],
  ticker: [
    { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Google Trends', url: 'https://trends.google.com/trending/rss?geo=US' },
    { name: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
  ],
};

const LEMMY_COMMUNITIES = ['news', 'world', 'technology', 'politics', 'science'];
const BLUESKY_DISCOVER_FEED = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';

// Hacker News API base
const HN_API = 'https://hacker-news.firebaseio.com/v0';


// ============================================
// Simple in-memory cache
// ============================================
const cache = {
  headlines: { data: null, timestamp: 0 },
  tech: { data: null, timestamp: 0 },
  science: { data: null, timestamp: 0 },
  local: { data: null, timestamp: 0 },
  gdelt: { data: null, timestamp: 0 },
  macro: { data: null, timestamp: 0 },
  ticker: { data: null, timestamp: 0 },
  markets: { data: null, timestamp: 0 },
  crypto: { data: null, timestamp: 0 },
  weather: { data: null, timestamp: 0 },
  radar: { data: null, timestamp: 0 },
  predictions: { data: null, timestamp: 0 },
  polymarket: { data: null, timestamp: 0 },
  pizzint: { data: null, timestamp: 0 },
  lemmy: { data: null, timestamp: 0 },
  openSocial: { data: null, timestamp: 0 },
  hackernews: { data: null, timestamp: 0 },
  fourchan: { data: null, timestamp: 0 },
  geocode: {},  // zip -> {lat, lon} cache
};

const CACHE_TTL = {
  headlines: 60 * 1000,  // 1 minute
  tech: 60 * 1000,       // 1 minute
  science: 60 * 1000,    // 1 minute
  local: 60 * 1000,       // 1 minute
  gdelt: 5 * 60 * 1000,   // Public GDELT endpoint asks clients to poll slowly
  macro: 5 * 60 * 1000,
  ticker: 60 * 1000,     // 1 minute
  markets: 30 * 1000,    // 30 seconds
  crypto: 60 * 1000,     // 1 minute
  weather: 5 * 60 * 1000, // 5 minutes
  radar: 2 * 60 * 1000,   // 2 minutes
  predictions: 60 * 1000, // 1 minute
  polymarket: 5 * 60 * 1000,
  pizzint: 5 * 60 * 1000,
  lemmy: 2 * 60 * 1000,
  openSocial: 2 * 60 * 1000,
  hackernews: 2 * 60 * 1000, // 2 minutes
  fourchan: 2 * 60 * 1000,   // 2 minutes
};

const CONTENT_MAX_AGE = {
  headlines: 7 * 24 * 60 * 60 * 1000,
  tech: 7 * 24 * 60 * 60 * 1000,
  science: 7 * 24 * 60 * 60 * 1000,
  ticker: 2 * 24 * 60 * 60 * 1000,
};

const inFlightRequests = new Map();
let gdeltBackoffUntil = 0;

function dedupeRequest(key, loader) {
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);
  const request = Promise.resolve()
    .then(loader)
    .finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, request);
  return request;
}

// Default location (Alexandria, VA - zip 22314)
const DEFAULT_ZIP = '22314';

function isCacheValid(key) {
  const entry = cache[key];
  if (!entry.data || (Date.now() - entry.timestamp) >= CACHE_TTL[key]) return false;
  // Don't treat empty arrays as valid cache
  if (Array.isArray(entry.data) && entry.data.length === 0) return false;
  return true;
}

// ============================================
// HTTP Fetch Helper
// ============================================
function fetch(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Too many redirects'));
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return reject(new Error('Invalid URL'));
    }
    if (!isSafePublicUrl(parsedUrl)) {
      return reject(new Error('URL must point to a public HTTP(S) host'));
    }
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': options.accept || '*/*',
        ...options.headers,
      },
      timeout: options.timeout || 5000,
    };

    const req = protocol.request(reqOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsedUrl.protocol}//${parsedUrl.host}${res.headers.location}`;
        return fetch(redirectUrl, options, redirectCount + 1).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ data, status: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function fetchConfiguredFeed(feed, options = {}) {
  if (!feed.nativeFetch) {
    return fetch(feed.url, options);
  }

  const response = await globalThis.fetch(feed.url, {
    headers: {
      Accept: options.accept || '*/*',
      'User-Agent': 'Mozilla/5.0',
      ...feed.headers,
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeout || 10000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { data: await response.text(), status: response.status };
}

function isSafePublicUrl(value) {
  const parsed = value instanceof URL ? value : new URL(value);
  const hostname = parsed.hostname.toLowerCase();
  const isPrivateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(hostname);
  const isPrivateIpv6 = hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:');
  return (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    !parsed.username &&
    !parsed.password &&
    !parsed.port.match(/^(?!80$|443$)\d+$/) &&
    hostname !== 'localhost' &&
    !hostname.endsWith('.local') &&
    !hostname.endsWith('.internal') &&
    hostname !== 'metadata.google.internal' &&
    !isPrivateIpv4 &&
    !isPrivateIpv6
  );
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num));
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').trim();
}

function parseGdeltDate(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second)
  ));
  return Number.isFinite(date.getTime()) ? date : null;
}

async function fetchGdeltArticles() {
  if (isCacheValid('gdelt')) return cache.gdelt.data;
  if (Date.now() < gdeltBackoffUntil) return cache.gdelt.data || [];

  try {
    const query = new URLSearchParams({
      query: 'sourcelang:english',
      mode: 'artlist',
      format: 'json',
      maxrecords: '30',
      sort: 'datedesc',
    });
    const { data } = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${query}`, {
      accept: 'application/json',
      timeout: 12000,
    });
    const document = JSON.parse(data);
    const result = (document.articles || []).flatMap(article => {
      const title = typeof article.title === 'string' ? article.title.trim() : '';
      const link = typeof article.url === 'string' ? article.url : '';
      const pubDate = parseGdeltDate(article.seendate);
      let safeLink = false;
      try {
        safeLink = isSafePublicUrl(link);
      } catch {
        safeLink = false;
      }
      if (!title || !safeLink || !pubDate) return [];
      return [{
        title,
        link,
        pubDate,
        description: article.domain ? `Indexed from ${article.domain}` : '',
        source: 'GDELT',
      }];
    });
    if (result.length > 0) cache.gdelt = { data: result, timestamp: Date.now() };
    return result.length > 0 ? result : cache.gdelt.data || [];
  } catch (err) {
    console.error('[GDELT]', err.message);
    if (/HTTP 429/.test(err.message)) gdeltBackoffUntil = Date.now() + 10 * 1000;
    return cache.gdelt.data || [];
  }
}

// ============================================
// Fetch Headlines
// ============================================
async function loadHeadlinePool() {
  if (isCacheValid('headlines')) {
    return cache.headlines.data;
  }

  console.log('[DATA] Fetching headlines...');

  // Fetch all feeds in parallel for speed
  const [rssResults, gdeltItems] = await Promise.all([
    Promise.all(
    RSS_FEEDS.headlines.map(async (feed) => {
      try {
        const { data } = await fetchConfiguredFeed(feed, {
          accept: 'application/rss+xml, application/xml, text/xml',
          headers: feed.headers,
          timeout: 10000,
        });
        const parsedItems = parseRSS(data, feed.name);
        let items = filterRecentItems(parsedItems, {
          maxAgeMs: feed.maxAgeMs || CONTENT_MAX_AGE.headlines,
        });
        if (items.length < parsedItems.length) {
          console.log(`[DATA] ${feed.name}: dropped ${parsedItems.length - items.length} stale, undated, or invalid items`);
        }
        if (feed.filter) {
          const before = items.length;
          items = items.filter(feed.filter);
          if (items.length < before) {
            console.log(`[DATA] ${feed.name}: filtered ${before - items.length} junk items`);
          }
        }
        console.log(`[DATA] ${feed.name}: ${items.length} items`);
        return items;
      } catch (err) {
        console.error(`[DATA] ${feed.name} failed:`, err.message);
        return [];
      }
    })
    ),
    fetchGdeltArticles(),
  ]);

  const allItems = [...rssResults.flat(), ...gdeltItems];

  // Sort by date, newest first
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  // Deduplicate by similar titles
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = unique.map((item) => ({
    id: stableId('headline', item.title, item.source),
    title: item.title,
    source: item.source,
    timestamp: item.pubDate.toISOString(),
    link: item.link,
    description: item.description,
  }));

  cache.headlines = { data: result, timestamp: Date.now() };
  return result;
}

function selectHeadlineItems(items, requestedSources = null) {
  const eligible = requestedSources === null
    ? items
    : items.filter(item => requestedSources.has(item.source));
  return selectDiverseItems(eligible, 50, 5);
}

async function fetchHeadlines(requestedSources = null) {
  const pool = await dedupeRequest('headline-pool', loadHeadlinePool);
  return selectHeadlineItems(pool, requestedSources);
}

function parseRequestedHeadlineSources(value) {
  if (value === undefined) return null;
  const allowedSources = new Set([...RSS_FEEDS.headlines.map(feed => feed.name), 'GDELT']);
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return new Set(
    raw
      .split(',')
      .map(source => source.trim())
      .filter(source => allowedSources.has(source))
  );
}

// ============================================
// Fetch Ticker Items
// ============================================
async function fetchTicker() {
  if (isCacheValid('ticker')) {
    return cache.ticker.data;
  }

  console.log('[DATA] Fetching ticker...');

  // Fetch all feeds in parallel for speed
  const feedResults = await Promise.all(
    RSS_FEEDS.ticker.map(async (feed) => {
      try {
        const { data } = await fetch(feed.url, {
          accept: 'application/rss+xml, application/xml, text/xml',
          headers: feed.headers,
        });
        return filterRecentItems(parseRSS(data, feed.name), { maxAgeMs: CONTENT_MAX_AGE.ticker });
      } catch (err) {
        console.error(`[DATA] Ticker ${feed.name} failed:`, err.message);
        return [];
      }
    })
  );

  const allItems = feedResults.flat();

  // Sort by date and take recent items
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = selectDiverseItems(unique, 30, 8).map((item, idx) => ({
    id: `ticker-${idx}`,
    text: item.title,
    source: item.source,
    category: categorizeHeadline(item.title, item.source),
  }));

  cache.ticker = { data: result, timestamp: Date.now() };
  return result;
}

function categorizeHeadline(title, source) {
  const lower = title.toLowerCase();

  // Google Trends items are always trending
  if (source === 'Google Trends') {
    return 'trending';
  }

  if (lower.includes('breaking') || lower.includes('just in') || lower.includes('urgent')) {
    return 'breaking';
  }
  if (lower.includes('stock') || lower.includes('market') || lower.includes('dow') ||
      lower.includes('nasdaq') || lower.includes('s&p') || lower.includes('bitcoin') ||
      lower.includes('crypto') || lower.includes('fed ') || lower.includes('inflation')) {
    return 'markets';
  }
  if (lower.includes('trending') || lower.includes('viral')) {
    return 'trending';
  }
  return 'general';
}

// ============================================
// Fetch Market Data (Yahoo Finance)
// ============================================
async function fetchMarkets() {
  if (isCacheValid('markets')) {
    return cache.markets.data;
  }

  console.log('[DATA] Fetching markets...');

  const symbols = [
    { symbol: '^GSPC', name: 'S&P 500', display: 'SPX' },
    { symbol: '^DJI', name: 'Dow Jones', display: 'DJI' },
    { symbol: '^IXIC', name: 'NASDAQ', display: 'IXIC' },
    { symbol: '^RUT', name: 'Russell 2000', display: 'RUT' },
  ];

  const movers = [
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'AMD', name: 'AMD' },
    { symbol: 'NFLX', name: 'Netflix' },
    { symbol: 'CRM', name: 'Salesforce' },
  ];

  const results = {
    indices: [],
    movers: [],
  };

  // Fetch all quotes in parallel for speed
  const allQuotes = await Promise.all([
    ...symbols.map(async ({ symbol, name, display }) => {
      try {
        const data = await fetchYahooQuote(symbol);
        return data ? { type: 'index', symbol: display, name, ...data } : null;
      } catch (err) {
        console.error(`[DATA] ${symbol} failed:`, err.message);
        return null;
      }
    }),
    ...movers.map(async ({ symbol, name }) => {
      try {
        const data = await fetchYahooQuote(symbol);
        return data ? { type: 'mover', symbol, name, ...data } : null;
      } catch (err) {
        console.error(`[DATA] ${symbol} failed:`, err.message);
        return null;
      }
    }),
  ]);

  // Separate indices and movers from results
  for (const quote of allQuotes) {
    if (!quote) continue;
    if (quote.type === 'index') {
      results.indices.push({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      });
    } else {
      results.movers.push({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      });
    }
  }

  // Sort movers by absolute change percent
  results.movers.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

  cache.markets = { data: results, timestamp: Date.now() };
  return results;
}

async function fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  try {
    const { data } = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const json = JSON.parse(data);
    const result = json.chart?.result?.[0];

    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch (err) {
    console.error(`[YAHOO] ${symbol}:`, err.message);
    return null;
  }
}

// ============================================
// Fetch Crypto Data (CoinGecko)
// ============================================
async function fetchCrypto() {
  if (isCacheValid('crypto')) {
    return cache.crypto.data;
  }

  console.log('[DATA] Fetching crypto...');

  const coins = ['bitcoin', 'ethereum', 'solana', 'dogecoin', 'cardano', 'ripple'];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const { data } = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    const json = JSON.parse(data);

    const result = [
      { symbol: 'BTC', name: 'Bitcoin', ...formatCoinGecko(json.bitcoin) },
      { symbol: 'ETH', name: 'Ethereum', ...formatCoinGecko(json.ethereum) },
      { symbol: 'SOL', name: 'Solana', ...formatCoinGecko(json.solana) },
      { symbol: 'DOGE', name: 'Dogecoin', ...formatCoinGecko(json.dogecoin) },
      { symbol: 'ADA', name: 'Cardano', ...formatCoinGecko(json.cardano) },
      { symbol: 'XRP', name: 'Ripple', ...formatCoinGecko(json.ripple) },
    ].filter(c => c.price);

    cache.crypto = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error('[COINGECKO]', err.message);
    return cache.crypto.data || [];
  }
}

function formatCoinGecko(data) {
  if (!data) return { price: null };
  const price = data.usd;
  const changePercent = data.usd_24h_change || 0;
  const change = price * (changePercent / 100);
  return {
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

// ============================================
// Fetch free macroeconomic data (FRED)
// ============================================
async function fetchFredSeries(series) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(series.id)}&cosd=2025-01-01`;
  // FRED's CSV endpoint intermittently stalls when accessed through the
  // generic RSS request helper, so use Node's native fetch for this fixed,
  // public endpoint.
  const response = await globalThis.fetch(url, {
    headers: {
      Accept: 'text/csv',
      'User-Agent': 'BlakeNewsNow/0.4 (macro reader)',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.text();
  const rows = data
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map(line => {
      const [date, rawValue] = line.split(',');
      const value = Number(rawValue);
      return { date, value };
    })
    .filter(row => row.date && Number.isFinite(row.value));
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  if (!latest) return null;
  return {
    id: series.id,
    name: series.name,
    unit: series.unit,
    value: latest.value,
    previousValue: previous?.value ?? null,
    change: previous ? latest.value - previous.value : null,
    date: latest.date,
    url: `https://fred.stlouisfed.org/series/${encodeURIComponent(series.id)}`,
    source: 'FRED',
  };
}

async function fetchMacroData() {
  if (isCacheValid('macro')) return cache.macro.data;

  const series = [
    { id: 'CPIAUCSL', name: 'CPI', unit: 'index' },
    { id: 'UNRATE', name: 'Unemployment', unit: '%' },
    { id: 'FEDFUNDS', name: 'Fed funds', unit: '%' },
    { id: 'DGS10', name: '10Y Treasury', unit: '%' },
  ];
  const results = await Promise.all(series.map(async item => {
    try {
      return await fetchFredSeries(item);
    } catch (err) {
      console.error(`[FRED] ${item.id} failed:`, err.message);
      return null;
    }
  }));
  const data = results.filter(Boolean);
  if (data.length > 0) cache.macro = { data, timestamp: Date.now() };
  return data.length > 0 ? data : cache.macro.data || [];
}

// ============================================
// Geocoding (Zip to Lat/Lon)
// ============================================

// Hardcoded zip codes for reliability
const KNOWN_ZIPS = {
  '22314': { lat: 38.8048, lon: -77.0469, display: 'Alexandria, VA' },
  '22301': { lat: 38.8206, lon: -77.0588, display: 'Alexandria, VA' },
  '22302': { lat: 38.8340, lon: -77.0742, display: 'Alexandria, VA' },
};

async function geocodeZip(zip) {
  // Check cache
  if (cache.geocode[zip]) {
    return cache.geocode[zip];
  }

  // Check hardcoded zips first (more reliable)
  if (KNOWN_ZIPS[zip]) {
    console.log(`[GEO] Using hardcoded: ${zip} -> ${KNOWN_ZIPS[zip].display}`);
    cache.geocode[zip] = KNOWN_ZIPS[zip];
    return KNOWN_ZIPS[zip];
  }

  console.log(`[GEO] Geocoding zip: ${zip}`);

  // Use Nominatim (OpenStreetMap) for geocoding
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`;

  try {
    const { data } = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    const results = JSON.parse(data);
    if (results && results.length > 0) {
      const result = {
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon),
        display: results[0].display_name?.split(',')[0] || zip,
      };
      cache.geocode[zip] = result;
      console.log(`[GEO] ${zip} -> ${result.lat}, ${result.lon} (${result.display})`);
      return result;
    }
  } catch (err) {
    console.error('[GEO] Nominatim failed:', err.message);
  }

  return null;
}

// ============================================
// NWS API (National Weather Service)
// ============================================
async function fetchNWSWeather(lat, lon) {
  // Step 1: Get the grid point for this location
  const pointUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;

  try {
    const { data: pointData } = await fetch(pointUrl, {
      headers: {
        'Accept': 'application/geo+json',
        'User-Agent': 'BlakeNewsNow Weather Display (github.com/blakenewsnow)',
      },
    });

    const point = JSON.parse(pointData);
    const forecastUrl = point.properties?.forecast;
    const forecastHourlyUrl = point.properties?.forecastHourly;
    const observationStationsUrl = point.properties?.observationStations;
    const city = point.properties?.relativeLocation?.properties?.city || '';
    const state = point.properties?.relativeLocation?.properties?.state || '';

    if (!forecastUrl) {
      throw new Error('No forecast URL in NWS response');
    }

    // Step 2: Get current observations from nearest station
    let currentTemp = null;
    let currentCondition = null;
    let humidity = null;
    let windSpeed = null;

    if (observationStationsUrl) {
      try {
        const { data: stationsData } = await fetch(observationStationsUrl, {
          headers: {
            'Accept': 'application/geo+json',
            'User-Agent': 'BlakeNewsNow Weather Display (github.com/blakenewsnow)',
          },
        });
        const stations = JSON.parse(stationsData);
        const stationId = stations.features?.[0]?.properties?.stationIdentifier;

        if (stationId) {
          const obsUrl = `https://api.weather.gov/stations/${stationId}/observations/latest`;
          const { data: obsData } = await fetch(obsUrl, {
            headers: {
              'Accept': 'application/geo+json',
              'User-Agent': 'BlakeNewsNow Weather Display (github.com/blakenewsnow)',
            },
          });
          const obs = JSON.parse(obsData);
          const props = obs.properties;

          // Temperature (convert C to F)
          if (props?.temperature?.value != null) {
            currentTemp = Math.round(props.temperature.value * 9/5 + 32);
          }
          currentCondition = props?.textDescription || null;
          if (props?.relativeHumidity?.value != null) {
            humidity = Math.round(props.relativeHumidity.value);
          }
          if (props?.windSpeed?.value != null) {
            // Convert m/s to mph
            windSpeed = Math.round(props.windSpeed.value * 0.621371);
          }
        }
      } catch (err) {
        console.error('[NWS] Observation fetch failed:', err.message);
      }
    }

    // Step 3: Get forecast
    const { data: forecastData } = await fetch(forecastUrl, {
      headers: {
        'Accept': 'application/geo+json',
        'User-Agent': 'BlakeNewsNow Weather Display (github.com/blakenewsnow)',
      },
    });
    const forecast = JSON.parse(forecastData);
    const periods = forecast.properties?.periods || [];

    // Current period for conditions if we don't have observations
    const currentPeriod = periods[0];
    if (!currentTemp && currentPeriod) {
      currentTemp = currentPeriod.temperature;
    }
    if (!currentCondition && currentPeriod) {
      currentCondition = currentPeriod.shortForecast;
    }

    // Build 5-day forecast (get day periods only)
    const dailyForecast = [];
    for (const period of periods) {
      if (period.isDaytime && dailyForecast.length < 5) {
        dailyForecast.push({
          day: period.name.substring(0, 3).toUpperCase(),
          high: period.temperature,
          low: null, // Will be filled from night period
          condition: period.shortForecast,
          icon: mapNWSIcon(period.icon),
        });
      } else if (!period.isDaytime && dailyForecast.length > 0) {
        // Fill in the low temp from night period
        const lastDay = dailyForecast[dailyForecast.length - 1];
        if (lastDay && lastDay.low === null) {
          lastDay.low = period.temperature;
        }
      }
    }

    return {
      temperature: currentTemp,
      condition: currentCondition,
      humidity: humidity,
      windSpeed: windSpeed,
      location: city && state ? `${city}, ${state}` : 'Unknown',
      high: dailyForecast[0]?.high || currentTemp,
      low: dailyForecast[0]?.low || currentTemp - 10,
      feelsLike: currentTemp, // NWS doesn't provide feels-like in observations
      forecast: dailyForecast,
    };
  } catch (err) {
    console.error('[NWS] Weather fetch failed:', err.message);
    return null;
  }
}

function mapNWSIcon(iconUrl) {
  // Map NWS icon URLs to our icon names
  if (!iconUrl) return 'cloudy';
  const url = iconUrl.toLowerCase();
  if (url.includes('skc') || url.includes('few') || url.includes('hot')) return 'sunny';
  if (url.includes('rain') || url.includes('showers') || url.includes('tsra')) return 'rainy';
  if (url.includes('snow') || url.includes('blizzard') || url.includes('cold')) return 'snowy';
  if (url.includes('ovc') || url.includes('bkn')) return 'cloudy';
  if (url.includes('sct') || url.includes('wind')) return 'partlyCloudy';
  return 'partlyCloudy';
}

// ============================================
// RainViewer API (Radar)
// ============================================
async function fetchRadarData() {
  // Get available radar timestamps
  const url = 'https://api.rainviewer.com/public/weather-maps.json';

  try {
    const { data } = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    const json = JSON.parse(data);
    const radar = json.radar;

    if (!radar || !radar.past) {
      throw new Error('No radar data available');
    }

    // Get the most recent radar frames
    const frames = radar.past.map(frame => ({
      time: frame.time,
      path: frame.path,
    }));

    // Add nowcast (future predictions) if available
    if (radar.nowcast) {
      frames.push(...radar.nowcast.map(frame => ({
        time: frame.time,
        path: frame.path,
        isNowcast: true,
      })));
    }

    return {
      host: json.host,
      frames,
      generated: json.generated,
    };
  } catch (err) {
    console.error('[RADAR] Failed to fetch radar data:', err.message);
    return null;
  }
}

// ============================================
// Fetch Weather (Combined)
// ============================================
async function fetchWeather(zip = DEFAULT_ZIP) {
  const cacheKey = `weather_${zip}`;
  if (cache.weather[cacheKey] && (Date.now() - cache.weather[cacheKey].timestamp) < CACHE_TTL.weather) {
    return cache.weather[cacheKey].data;
  }

  console.log(`[WEATHER] Fetching weather for zip: ${zip}`);

  // Geocode zip to lat/lon
  const coords = await geocodeZip(zip);
  if (!coords) {
    console.error('[WEATHER] Could not geocode zip:', zip);
    return null;
  }

  // Fetch NWS weather
  const weather = await fetchNWSWeather(coords.lat, coords.lon);
  if (!weather) {
    return null;
  }

  // Add coordinates for radar
  weather.lat = coords.lat;
  weather.lon = coords.lon;

  // Override location with geocoded display name (more accurate than NWS relativeLocation)
  if (coords.display) {
    weather.location = coords.display;
  }

  // Cache result
  if (!cache.weather[cacheKey]) cache.weather[cacheKey] = {};
  cache.weather[cacheKey] = { data: weather, timestamp: Date.now() };

  return weather;
}

// ============================================
// Polymarket Predictions
// ============================================
function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isSportsMarket(question) {
  const q = question.toLowerCase();
  return q.includes('nba') || q.includes('nfl') || q.includes('mlb') ||
    q.includes('nhl') || q.includes('ncaa') || q.includes('ufc') ||
    q.includes('tennis') || q.includes('golf') || q.includes('soccer') ||
    q.includes('football') || q.includes('basketball') || q.includes('baseball') ||
    q.includes('hockey') || q.includes('f1') || q.includes('formula') ||
    q.includes('nascar') || q.includes('pga') || q.includes('boxing') ||
    q.includes('mma') || q.includes('wrestling') || q.includes('olympics') ||
    q.includes(' vs ') || q.includes(' vs. ') ||
    q.includes('warriors') || q.includes('lakers') || q.includes('celtics') ||
    q.includes('cavaliers') || q.includes('magic') || q.includes('timberwolves') ||
    q.includes('knicks') || q.includes('bulls') || q.includes('heat') ||
    q.includes('mavs') || q.includes('mavericks') || q.includes('spurs') ||
    q.includes('nuggets') || q.includes('suns') || q.includes('clippers') ||
    q.includes('chiefs') || q.includes('eagles') || q.includes('patriots') ||
    q.includes('cowboys') || q.includes('packers') || q.includes('ravens') ||
    q.includes('super bowl') || q.includes('world series') ||
    q.includes('stanley cup') || q.includes('march madness') ||
    q.includes('playoffs') || q.includes('championship');
}

function normalizePolymarketMarket(market, now = Date.now()) {
  const question = typeof market?.question === 'string' ? market.question.trim() : '';
  const volume24h = Number(market?.volume24hr);
  if (
    !market?.id ||
    !question ||
    market.closed ||
    market.archived ||
    market.active === false ||
    isSportsMarket(question) ||
    !Number.isFinite(volume24h) ||
    volume24h < 5000
  ) {
    return null;
  }

  const marketEnd = new Date(market.endDate).getTime();
  if (Number.isFinite(marketEnd) && marketEnd <= now) return null;

  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  const yesIndex = outcomes.findIndex(outcome => String(outcome).toLowerCase() === 'yes');
  const yesPrice = Number(prices[yesIndex >= 0 ? yesIndex : 0]);
  if (!Number.isFinite(yesPrice) || yesPrice < 0.02 || yesPrice > 0.98) return null;

  const events = Array.isArray(market.events) ? market.events : [];
  const currentEvent = events.find(event => {
    const end = new Date(event.endDate).getTime();
    return !event.closed && event.active !== false && (!Number.isFinite(end) || end > now);
  }) || events.find(event => event?.slug);
  const eventSlug = currentEvent?.slug || market.slug;
  if (!eventSlug) return null;

  const marketSlug = market.slug && market.slug !== eventSlug
    ? `?marketSlug=${encodeURIComponent(market.slug)}`
    : '';

  return {
    id: String(market.id),
    question: truncateQuestion(question),
    yesPrice: Math.round(yesPrice * 100),
    volume24h,
    volumeDisplay: formatVolume(volume24h),
    slug: market.slug,
    eventSlug,
    url: `https://polymarket.com/event/${encodeURIComponent(eventSlug)}${marketSlug}`,
    endDate: Number.isFinite(marketEnd) ? new Date(marketEnd).toISOString() : null,
    category: categorizeMarket(question),
    source: 'Polymarket',
  };
}

function normalizeKalshiMarket(market, now = Date.now()) {
  const question = typeof market?.title === 'string' ? market.title.trim() : '';
  const volume24h = Number(market?.volume_24h_fp);
  const yesPrice = Number(market?.last_price_dollars || market?.yes_bid_dollars);
  const marketEnd = new Date(market?.close_time || market?.expiration_time).getTime();
  if (
    !market?.ticker ||
    !question ||
    market.status !== 'active' ||
    isSportsMarket(question) ||
    !Number.isFinite(volume24h) ||
    volume24h < 1000 ||
    !Number.isFinite(yesPrice) ||
    yesPrice < 0.02 ||
    yesPrice > 0.98 ||
    (Number.isFinite(marketEnd) && marketEnd <= now)
  ) {
    return null;
  }

  return {
    id: `kalshi-${market.ticker}`,
    question: truncateQuestion(question),
    yesPrice: Math.round(yesPrice * 100),
    volume24h,
    volumeDisplay: formatVolume(volume24h),
    slug: market.ticker,
    eventSlug: market.event_ticker || market.ticker,
    url: `https://kalshi.com/markets/${encodeURIComponent(market.event_ticker || market.ticker)}/${encodeURIComponent(market.ticker)}`,
    endDate: Number.isFinite(marketEnd) ? new Date(marketEnd).toISOString() : null,
    category: categorizeMarket(question),
    source: 'Kalshi',
  };
}

async function fetchKalshiDirect() {
  console.log('[DATA] Fetching predictions from Kalshi...');
  try {
    const { data } = await fetch('https://api.elections.kalshi.com/trade-api/v2/markets?limit=1000&status=open', {
      headers: { 'Accept': 'application/json' },
      timeout: 12000,
    });
    const markets = JSON.parse(data).markets || [];
    const result = markets
      .map(market => normalizeKalshiMarket(market))
      .filter(Boolean)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 25);
    return result;
  } catch (err) {
    console.error('[KALSHI]', err.message);
    return [];
  }
}

async function fetchPolymarketDirect() {
  console.log('[DATA] Fetching predictions from Polymarket...');

  const url = 'https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false&order=volume24hr&ascending=false';

  try {
    const { data } = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    const markets = JSON.parse(data);

    const result = markets
      .map(market => normalizePolymarketMarket(market))
      .filter(Boolean)
      .slice(0, 25);

    if (result.length > 0) {
      cache.polymarket = { data: result, timestamp: Date.now() };
    }
    return result.length > 0 ? result : cache.polymarket.data || [];
  } catch (err) {
    console.error('[POLYMARKET]', err.message);
    return cache.polymarket.data || [];
  }
}

async function fetchPizzintWatch() {
  console.log('[DATA] Fetching pizzint.watch geopolitical predictions...');

  try {
    const { data } = await fetch('https://pizzint.watch', { timeout: 10000 });

    // Extract initialDoomsdayData from Next.js RSC payload
    // In the HTML the JSON is double-escaped: initialDoomsdayData\\\":{\\\"markets\\\":[...]}
    const idx = data.indexOf('initialDoomsdayData');
    if (idx < 0) {
      console.log('[PIZZINT] Could not find initialDoomsdayData in page');
      return [];
    }

    // Extract from the opening { after initialDoomsdayData\\\":
    // Find the markets array by looking for the pattern and matching brackets
    const dataSlice = data.substring(idx);
    const marketsStart = dataSlice.indexOf('markets');
    if (marketsStart < 0) {
      console.log('[PIZZINT] Could not find markets array');
      return [];
    }

    // Find the opening [ after "markets\\":
    const arrStart = dataSlice.indexOf('[', marketsStart);
    if (arrStart < 0) {
      console.log('[PIZZINT] Could not find markets array start');
      return [];
    }

    // Match brackets to find the end of the array
    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < dataSlice.length; i++) {
      if (dataSlice[i] === '[') depth++;
      else if (dataSlice[i] === ']') {
        depth--;
        if (depth === 0) { arrEnd = i + 1; break; }
      }
    }
    if (arrEnd < 0) {
      console.log('[PIZZINT] Could not find markets array end');
      return [];
    }

    // Unescape the JSON-escaped string
    const rawArray = dataSlice.substring(arrStart, arrEnd).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    let markets;
    try {
      markets = JSON.parse(rawArray);
    } catch (parseErr) {
      console.error('[PIZZINT] JSON parse failed:', parseErr.message);
      return [];
    }
    const now = Date.now();

    const result = markets
      .filter(m => {
        if (m.endDate && new Date(m.endDate).getTime() < now) return false;
        return m.label || m.question || m.title;
      })
      .map(m => {
        const question = m.label || m.question || m.title || '';
        const yesPrice = m.price != null
          ? Math.round(m.price * 100)
          : m.probability != null
            ? Math.round(m.probability * 100)
            : 50;

        const volume24h = Number(m.volume_24h ?? m.volume24hr ?? m.volume) || 0;
        const eventSlug = m.eventSlug || null;

        return {
          id: `pizzint-${m.id || m.slug || crypto.createHash('md5').update(question).digest('hex').slice(0, 10)}`,
          question: truncateQuestion(question),
          yesPrice,
          volume24h,
          volumeDisplay: formatVolume(volume24h),
          slug: m.slug || null,
          eventSlug,
          url: eventSlug
            ? `https://polymarket.com/event/${encodeURIComponent(eventSlug)}`
            : 'https://pizzint.watch',
          endDate: m.endDate ? new Date(m.endDate).toISOString() : null,
          category: 'geopolitical',
          source: 'pizzint.watch',
        };
      });

    if (result.length > 0) {
      cache.pizzint = { data: result, timestamp: Date.now() };
    }
    return result.length > 0 ? result : cache.pizzint.data || [];
  } catch (err) {
    console.error('[PIZZINT]', err.message);
    return cache.pizzint.data || [];
  }
}

async function fetchPredictions() {
  if (isCacheValid('predictions')) {
    return cache.predictions.data;
  }

  const [polymarket, kalshi, pizzint] = await Promise.all([
    fetchPolymarketDirect(),
    fetchKalshiDirect(),
    fetchPizzintWatch(),
  ]);

  // Deduplicate by slug (pizzint items may overlap with Polymarket)
  const seenSlugs = new Set();
  const merged = [];

  for (const item of polymarket) {
    if (item.slug) seenSlugs.add(item.slug);
    merged.push(item);
  }

  for (const item of kalshi) {
    if (item.slug && seenSlugs.has(item.slug)) continue;
    if (item.slug) seenSlugs.add(item.slug);
    merged.push(item);
  }

  for (const item of pizzint) {
    if (item.slug && seenSlugs.has(item.slug)) continue;
    merged.push(item);
  }

  const result = merged.slice(0, 30);

  if (result.length > 0) {
    cache.predictions = { data: result, timestamp: Date.now() };
  }
  return result;
}

function truncateQuestion(q) {
  if (!q) return '';
  let clean = q.trim();

  // Truncate if too long
  if (clean.length > 60) {
    clean = clean.substring(0, 57) + '...';
  }
  return clean;
}

function formatVolume(vol) {
  if (!vol) return '$0';
  if (vol >= 1000000) {
    return '$' + (vol / 1000000).toFixed(1) + 'M';
  }
  if (vol >= 1000) {
    return '$' + (vol / 1000).toFixed(0) + 'K';
  }
  return '$' + Math.round(vol);
}

function categorizeMarket(question) {
  const q = (question || '').toLowerCase();
  if (q.includes('trump') || q.includes('biden') || q.includes('election') ||
      q.includes('president') || q.includes('congress') || q.includes('senate')) {
    return 'politics';
  }
  if (q.includes('fed') || q.includes('interest rate') || q.includes('inflation') ||
      q.includes('bitcoin') || q.includes('crypto') || q.includes('stock')) {
    return 'finance';
  }
  if (q.includes('war') || q.includes('strike') || q.includes('military') ||
      q.includes('attack') || q.includes('iran') || q.includes('russia') ||
      q.includes('china') || q.includes('ukraine')) {
    return 'world';
  }
  return 'general';
}

// ============================================
// Fetch Tech News (RSS)
// ============================================
async function fetchTechNews() {
  if (isCacheValid('tech')) {
    return cache.tech.data;
  }

  console.log('[DATA] Fetching tech news...');

  const feedResults = await Promise.all(
    RSS_FEEDS.tech.map(async (feed) => {
      try {
        const { data } = await fetch(feed.url, {
          accept: 'application/rss+xml, application/xml, text/xml',
          headers: feed.headers,
        });
        const parsedItems = parseRSS(data, feed.name);
        let items = filterRecentItems(parsedItems, {
          maxAgeMs: feed.maxAgeMs || CONTENT_MAX_AGE.tech,
        });
        if (items.length < parsedItems.length) {
          console.log(`[DATA] ${feed.name}: dropped ${parsedItems.length - items.length} stale, undated, or invalid items`);
        }
        if (feed.filter) {
          const before = items.length;
          items = items.filter(feed.filter);
          if (items.length < before) {
            console.log(`[DATA] ${feed.name}: filtered ${before - items.length} junk items`);
          }
        }
        console.log(`[DATA] ${feed.name}: ${items.length} items`);
        return items;
      } catch (err) {
        console.error(`[DATA] ${feed.name} failed:`, err.message);
        return [];
      }
    })
  );

  const allItems = feedResults.flat();
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  // Deduplicate
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = selectDiverseItems(unique, 50, 6).map((item) => ({
    id: stableId('tech', item.title, item.source),
    title: item.title,
    source: item.source,
    timestamp: item.pubDate.toISOString(),
    link: item.link,
    description: item.description,
  }));

  cache.tech = { data: result, timestamp: Date.now() };
  return result;
}

// ============================================
// Fetch Science News and Journals (RSS/Atom)
// ============================================
async function loadSciencePool() {
  if (isCacheValid('science')) {
    return cache.science.data;
  }

  console.log('[DATA] Fetching science news and journals...');

  const feedResults = await Promise.all(
    RSS_FEEDS.science.map(async feed => {
      try {
        const { data } = await fetch(feed.url, {
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          headers: feed.headers,
        });
        const parsedItems = parseRSS(data, feed.name);
        let items = filterRecentItems(parsedItems, {
          maxAgeMs: feed.maxAgeMs || CONTENT_MAX_AGE.science,
        });
        if (items.length < parsedItems.length) {
          console.log(`[DATA] ${feed.name}: dropped ${parsedItems.length - items.length} stale, undated, or invalid items`);
        }
        if (feed.filter) {
          const before = items.length;
          items = items.filter(feed.filter);
          if (items.length < before) {
            console.log(`[DATA] ${feed.name}: filtered ${before - items.length} housekeeping items`);
          }
        }
        console.log(`[DATA] ${feed.name}: ${items.length} science items`);
        return items;
      } catch (err) {
        console.error(`[DATA] ${feed.name} failed:`, err.message);
        return [];
      }
    })
  );

  const allItems = feedResults.flat().sort((a, b) => b.pubDate - a.pubDate);
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const result = unique.map(item => ({
    id: stableId('science', item.title, item.source),
    title: item.title,
    source: item.source,
    timestamp: item.pubDate.toISOString(),
    link: item.link,
    description: item.description,
  }));

  cache.science = { data: result, timestamp: Date.now() };
  return result;
}

function selectScienceItems(items, requestedSources = null) {
  const eligible = requestedSources === null
    ? items
    : items.filter(item => requestedSources.has(item.source));
  const perSourceCap = Math.max(1, Math.floor(60 / RSS_FEEDS.science.length));
  return selectDiverseItems(eligible, 60, perSourceCap);
}

async function fetchScienceNews(requestedSources = null) {
  const pool = await dedupeRequest('science-pool', loadSciencePool);
  return selectScienceItems(pool, requestedSources);
}

function parseRequestedScienceSources(value) {
  if (value === undefined) return null;
  const allowedSources = new Set(RSS_FEEDS.science.map(feed => feed.name));
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return new Set(
    raw
      .split(',')
      .map(source => source.trim())
      .filter(source => allowedSources.has(source))
  );
}

// ============================================
// Fetch Local News (DC and Alexandria)
// ============================================
async function loadLocalPool() {
  if (isCacheValid('local')) return cache.local.data;

  console.log('[DATA] Fetching DC and Alexandria local news...');
  const feedResults = await Promise.all(
    RSS_FEEDS.local.map(async feed => {
      try {
        const { data } = await fetch(feed.url, {
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          headers: feed.headers,
          timeout: 10000,
        });
        const parsedItems = feed.parser === 'alexandria-html'
          ? parseAlexandriaNews(data, feed.name, feed.url)
          : parseRSS(data, feed.name);
        let items = filterRecentItems(parsedItems, {
          maxAgeMs: feed.maxAgeMs || CONTENT_MAX_AGE.headlines,
        });
        if (feed.filter) items = items.filter(feed.filter);
        console.log(`[DATA] Local ${feed.name}: ${items.length} items`);
        return items;
      } catch (err) {
        console.error(`[DATA] Local ${feed.name} failed:`, err.message);
        return [];
      }
    })
  );

  const allItems = feedResults.flat().sort((a, b) => b.pubDate - a.pubDate);
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const result = unique.map(item => ({
    id: stableId('local', item.title, item.source),
    title: item.title,
    source: item.source,
    timestamp: item.pubDate.toISOString(),
    link: item.link,
    description: item.description,
  }));

  cache.local = { data: result, timestamp: Date.now() };
  return result;
}

function selectLocalItems(items, requestedSources = null) {
  const eligible = requestedSources === null
    ? items
    : items.filter(item => requestedSources.has(item.source));
  return selectDiverseItems(eligible, 50, 8);
}

async function fetchLocalNews(requestedSources = null) {
  const pool = await dedupeRequest('local-pool', loadLocalPool);
  return selectLocalItems(pool, requestedSources);
}

function parseRequestedLocalSources(value) {
  if (value === undefined) return null;
  const allowedSources = new Set(RSS_FEEDS.local.map(feed => feed.name));
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  return new Set(
    raw
      .split(',')
      .map(source => source.trim())
      .filter(source => allowedSources.has(source))
  );
}

// ============================================
// Fetch user-provided public RSS/Atom feeds
// ============================================
function normalizeCustomFeedDefinitions(value) {
  let definitions;
  try {
    definitions = JSON.parse(String(value || '[]'));
  } catch {
    return [];
  }
  if (!Array.isArray(definitions)) return [];

  return definitions
    .slice(0, 20)
    .flatMap(definition => {
      const name = typeof definition?.name === 'string' ? definition.name.trim().slice(0, 100) : '';
      const url = typeof definition?.url === 'string' ? definition.url.trim() : '';
      if (!name || !url) return [];
      try {
        if (!isSafePublicUrl(url)) return [];
      } catch {
        return [];
      }
      return [{ name, url }];
    });
}

async function fetchCustomFeeds(definitions) {
  const results = await Promise.all(definitions.map(async feed => {
    try {
      const { data } = await fetch(feed.url, {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        headers: { 'User-Agent': 'BlakeNewsNow/0.4 (user RSS feed)' },
        timeout: 10000,
      });
      const items = filterRecentItems(parseRSS(data, feed.name), {
        maxAgeMs: CONTENT_MAX_AGE.headlines,
      });
      return items.map(item => ({
        id: stableId('custom', item.title, item.source),
        title: item.title,
        source: item.source,
        timestamp: item.pubDate.toISOString(),
        link: item.link,
        description: item.description,
      }));
    } catch (err) {
      console.error(`[DATA] Custom ${feed.name} failed:`, err.message);
      return [];
    }
  }));

  const allItems = results.flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const seen = new Set();
  return selectDiverseItems(allItems.filter(item => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }), 50, 8);
}

// ============================================
// Fetch Lemmy Posts
// ============================================
async function fetchLemmy() {
  if (isCacheValid('lemmy')) {
    return cache.lemmy.data;
  }

  console.log('[DATA] Fetching Lemmy...');

  const communityResults = await Promise.all(
    LEMMY_COMMUNITIES.map(async community => {
      try {
        const url = `https://lemmy.world/api/v3/post/list?community_name=${encodeURIComponent(community)}&sort=Hot&limit=25`;
        const { data } = await fetch(url, {
          accept: 'application/json',
          timeout: 10000,
        });
        const document = JSON.parse(data);
        const now = Date.now();
        const posts = (document.posts || []).flatMap(view => {
          const post = view.post || {};
          const counts = view.counts || {};
          const timestamp = new Date(post.published);
          const timestampMs = timestamp.getTime();
          if (
            !post.id ||
            !post.name ||
            post.deleted ||
            post.removed ||
            post.nsfw ||
            !Number.isFinite(timestampMs) ||
            timestampMs > now + 15 * 60 * 1000 ||
            timestampMs < now - CONTENT_MAX_AGE.headlines
          ) {
            return [];
          }

          const discussionUrl = post.ap_id || `https://lemmy.world/post/${post.id}`;
          const score = Number(counts.score) || 0;
          const comments = Number(counts.comments) || 0;
          const ageHours = Math.max(0, (now - timestampMs) / (60 * 60 * 1000));

          return [{
            id: stableId('lemmy', String(post.id), community),
            title: stripHtml(decodeEntities(post.name)),
            source: `c/${community}`,
            community,
            score,
            comments,
            url: post.url || discussionUrl,
            permalink: discussionUrl,
            timestamp: timestamp.toISOString(),
            description: stripHtml(decodeEntities(post.embed_description || post.body || '')).slice(0, 1200),
            rank: (score + (comments * 0.5) + 1) * Math.exp(-ageHours / 36),
          }];
        });
        console.log(`[LEMMY] c/${community}: ${posts.length} current posts`);
        return posts;
      } catch (err) {
        console.error(`[LEMMY] c/${community} failed:`, err.message);
        return [];
      }
    })
  );

  const allPosts = communityResults.flat().sort((a, b) => b.rank - a.rank);
  const seen = new Set();
  const unique = allPosts.filter(post => {
    const key = `${post.url || ''}|${post.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const result = selectDiverseItems(unique, 45, 15).map(({ rank, ...post }) => post);

  if (result.length > 0) {
    cache.lemmy = { data: result, timestamp: Date.now() };
    return result;
  }

  if (cache.lemmy.data) {
    console.warn('[LEMMY] All communities failed; returning the last successful response');
    return cache.lemmy.data;
  }
  return [];
}

// ============================================
// Fetch credential-free social signals
// ============================================
function normalizeBlueskyPost(view, now = Date.now()) {
  const post = view?.post || {};
  const record = post.record || {};
  const author = post.author || {};
  const timestamp = new Date(record.createdAt);
  const timestampMs = timestamp.getTime();
  const title = stripHtml(decodeEntities(record.text || '')).replace(/\s+/g, ' ').trim();
  const contentLabels = [
    ...(post.labels || []).map(label => label?.val),
    ...(record.labels?.values || []),
  ].filter(Boolean);

  if (
    !post.uri ||
    !author.handle ||
    !title ||
    contentLabels.some(label => ['porn', 'sexual', 'nudity', 'graphic-media'].includes(label)) ||
    !Number.isFinite(timestampMs) ||
    timestampMs > now + 15 * 60 * 1000 ||
    timestampMs < now - CONTENT_MAX_AGE.headlines
  ) {
    return null;
  }

  const postKey = post.uri.split('/').pop();
  if (!postKey) return null;
  const likes = Number(post.likeCount) || 0;
  const reposts = Number(post.repostCount) || 0;
  const replies = Number(post.replyCount) || 0;
  const external = post.embed?.external;

  return {
    id: stableId('bluesky', post.uri, author.handle),
    title: title.slice(0, 280),
    source: 'Bluesky Discover',
    community: 'discover',
    score: likes + reposts,
    comments: replies,
    url: `https://bsky.app/profile/${encodeURIComponent(author.handle)}/post/${encodeURIComponent(postKey)}`,
    permalink: `https://bsky.app/profile/${encodeURIComponent(author.handle)}/post/${encodeURIComponent(postKey)}`,
    timestamp: timestamp.toISOString(),
    description: stripHtml(decodeEntities(external?.description || '')).slice(0, 1200),
    rank: likes + (reposts * 2) + replies + 1,
  };
}

function normalizeMastodonLink(link, now = Date.now()) {
  const title = stripHtml(decodeEntities(link?.title || '')).replace(/\s+/g, ' ').trim();
  const history = Array.isArray(link?.history) ? link.history : [];
  const activeHistory = history
    .map(entry => ({
      timestamp: Number(entry?.day) * 1000,
      uses: Number(entry?.uses) || 0,
      accounts: Number(entry?.accounts) || 0,
    }))
    .filter(entry => Number.isFinite(entry.timestamp) && entry.timestamp > 0 && entry.uses > 0);
  const timestampMs = Math.max(0, ...activeHistory.map(entry => entry.timestamp));

  let url;
  try {
    url = new URL(link?.url || '');
  } catch {
    return null;
  }

  if (
    !title ||
    !['http:', 'https:'].includes(url.protocol) ||
    !timestampMs ||
    timestampMs > now + 15 * 60 * 1000 ||
    timestampMs < now - CONTENT_MAX_AGE.headlines
  ) {
    return null;
  }

  const uses = activeHistory.reduce((sum, entry) => sum + entry.uses, 0);
  const accounts = activeHistory.reduce((sum, entry) => sum + entry.accounts, 0);

  return {
    id: stableId('mastodon', url.href, link.provider_name || ''),
    title: title.slice(0, 280),
    source: 'Mastodon Trending',
    community: 'trending-links',
    score: uses,
    url: url.href,
    permalink: url.href,
    timestamp: new Date(timestampMs).toISOString(),
    description: stripHtml(decodeEntities(link.description || '')).slice(0, 1200),
    rank: uses + accounts + 1,
  };
}

async function fetchOpenSocial() {
  if (isCacheValid('openSocial')) {
    return cache.openSocial.data;
  }

  console.log('[DATA] Fetching open social signals...');
  const [blueskyPosts, mastodonLinks] = await Promise.all([
    (async () => {
      try {
        const query = new URLSearchParams({
          feed: BLUESKY_DISCOVER_FEED,
          limit: '40',
        });
        const { data } = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed?${query}`, {
          accept: 'application/json',
          headers: { 'Accept-Language': 'en' },
          timeout: 10000,
        });
        const document = JSON.parse(data);
        const posts = (document.feed || [])
          .map(view => normalizeBlueskyPost(view))
          .filter(Boolean);
        console.log(`[SOCIAL] Bluesky Discover: ${posts.length} current posts`);
        return posts;
      } catch (err) {
        console.error('[SOCIAL] Bluesky Discover failed:', err.message);
        return [];
      }
    })(),
    (async () => {
      try {
        const { data } = await fetch('https://mastodon.social/api/v1/trends/links?limit=20', {
          accept: 'application/json',
          timeout: 10000,
        });
        const links = JSON.parse(data)
          .map(link => normalizeMastodonLink(link))
          .filter(Boolean);
        console.log(`[SOCIAL] Mastodon Trending: ${links.length} current links`);
        return links;
      } catch (err) {
        console.error('[SOCIAL] Mastodon Trending failed:', err.message);
        return [];
      }
    })(),
  ]);

  const result = selectDiverseItems(
    [...blueskyPosts, ...mastodonLinks].sort((a, b) => b.rank - a.rank),
    30,
    15
  ).map(({ rank, ...item }) => item);

  if (result.length > 0) {
    cache.openSocial = { data: result, timestamp: Date.now() };
    return result;
  }
  return cache.openSocial.data || [];
}

// ============================================
// Fetch Hacker News
// ============================================
async function fetchHackerNews() {
  if (isCacheValid('hackernews')) {
    return cache.hackernews.data;
  }

  console.log('[DATA] Fetching Hacker News...');

  try {
    // Get top story IDs
    const { data: idsData } = await fetch(`${HN_API}/topstories.json`, {
      headers: { 'Accept': 'application/json' },
    });
    const storyIds = JSON.parse(idsData).slice(0, 30);

    // Fetch stories in parallel (batch of 10 at a time)
    const stories = [];
    for (let i = 0; i < storyIds.length; i += 10) {
      const batch = storyIds.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            const { data } = await fetch(`${HN_API}/item/${id}.json`, {
              headers: { 'Accept': 'application/json' },
            });
            return JSON.parse(data);
          } catch (err) {
            return null;
          }
        })
      );
      stories.push(...batchResults.filter(Boolean));
    }

    const result = stories.map(story => ({
      id: `hn-${story.id}`,
      title: story.title,
      source: 'Hacker News',
      score: story.score,
      comments: story.descendants || 0,
      url: story.url,
      permalink: `https://news.ycombinator.com/item?id=${story.id}`,
      timestamp: new Date(story.time * 1000).toISOString(),
      by: story.by,
      type: story.type,
    }));

    cache.hackernews = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error('[HN]', err.message);
    return cache.hackernews.data || [];
  }
}

// ============================================
// Fetch 4chan Threads
// ============================================
async function fetchFourChan() {
  if (isCacheValid('fourchan')) {
    return cache.fourchan.data;
  }

  console.log('[DATA] Fetching 4chan...');

  const boards = ['news', 'pol', 'lit'];
  const allThreads = [];

  // Fetch boards sequentially to respect 4chan rate limit (1 req/sec)
  for (let i = 0; i < boards.length; i++) {
    const board = boards[i];
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    try {
      const { data } = await fetch(`https://a.4cdn.org/${board}/catalog.json`, {
        headers: { 'Accept': 'application/json' },
        timeout: 8000,
      });
      const pages = JSON.parse(data);

      for (const page of pages) {
        for (const thread of (page.threads || [])) {
          if ((thread.replies || 0) < 5) continue;

          let title = thread.sub
            ? decodeEntities(stripHtml(thread.sub))
            : thread.com
              ? decodeEntities(stripHtml(thread.com)).substring(0, 80)
              : null;

          if (!title) continue;

          allThreads.push({
            id: stableId('4ch', String(thread.no), board),
            title,
            board: `/${board}/`,
            source: `/${board}/`,
            replies: thread.replies || 0,
            images: thread.images || 0,
            timestamp: new Date((thread.time || 0) * 1000).toISOString(),
            url: `https://boards.4chan.org/${board}/thread/${thread.no}`,
          });
        }
      }
      console.log(`[4CHAN] /${board}/: ${allThreads.length} threads (filtered)`);
    } catch (err) {
      console.error(`[4CHAN] /${board}/ failed:`, err.message);
    }
  }

  // Sort by reply count, while preventing a single board from consuming the list.
  allThreads.sort((a, b) => b.replies - a.replies);
  const result = selectDiverseItems(allThreads, 40, 14);

  if (result.length > 0) {
    cache.fourchan = { data: result, timestamp: Date.now() };
  }
  return result;
}

// ============================================
// Express Route Handlers
// ============================================
function registerRoutes(app) {
  app.get('/api/headlines', async (req, res) => {
    try {
      const requestedSources = parseRequestedHeadlineSources(req.query.sources);
      const data = await fetchHeadlines(requestedSources);
      res.json(data);
    } catch (err) {
      console.error('[API] Headlines error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/local', async (req, res) => {
    try {
      const requestedSources = parseRequestedLocalSources(req.query.sources);
      const data = await fetchLocalNews(requestedSources);
      res.json(data);
    } catch (err) {
      console.error('[API] Local news error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/custom', async (req, res) => {
    try {
      const definitions = normalizeCustomFeedDefinitions(req.query.feeds);
      const data = await dedupeRequest(
        `custom:${JSON.stringify(definitions)}`,
        () => fetchCustomFeeds(definitions)
      );
      res.json(data);
    } catch (err) {
      console.error('[API] Custom feeds error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ticker', async (req, res) => {
    try {
      const data = await dedupeRequest('ticker', fetchTicker);
      res.json(data);
    } catch (err) {
      console.error('[API] Ticker error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/markets', async (req, res) => {
    try {
      const data = await dedupeRequest('markets', fetchMarkets);
      res.json(data);
    } catch (err) {
      console.error('[API] Markets error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/crypto', async (req, res) => {
    try {
      const data = await dedupeRequest('crypto', fetchCrypto);
      res.json(data);
    } catch (err) {
      console.error('[API] Crypto error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/macro', async (_req, res) => {
    try {
      const data = await dedupeRequest('macro', fetchMacroData);
      res.json(data);
    } catch (err) {
      console.error('[API] Macro data error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/weather', async (req, res) => {
    try {
      const zip = req.query.zip || DEFAULT_ZIP;
      if (typeof zip !== 'string' || !/^\d{5}$/.test(zip)) {
        return res.status(400).json({ error: 'ZIP code must contain five digits' });
      }
      const data = await dedupeRequest(`weather:${zip}`, () => fetchWeather(zip));
      if (!data) {
        return res.status(503).json({ error: 'Weather data unavailable' });
      }
      res.json(data);
    } catch (err) {
      console.error('[API] Weather error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/radar', async (req, res) => {
    try {
      const data = await dedupeRequest('radar', fetchRadarData);
      if (!data) {
        return res.status(503).json({ error: 'Radar data unavailable' });
      }
      res.json(data);
    } catch (err) {
      console.error('[API] Radar error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/predictions', async (req, res) => {
    try {
      const data = await dedupeRequest('predictions', fetchPredictions);
      res.json(data);
    } catch (err) {
      console.error('[API] Predictions error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/lemmy', async (req, res) => {
    try {
      const data = await dedupeRequest('lemmy', fetchLemmy);
      res.json(data);
    } catch (err) {
      console.error('[API] Lemmy error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/open-social', async (req, res) => {
    try {
      const data = await dedupeRequest('openSocial', fetchOpenSocial);
      res.json(data);
    } catch (err) {
      console.error('[API] Open social error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hackernews', async (req, res) => {
    try {
      const data = await dedupeRequest('hackernews', fetchHackerNews);
      res.json(data);
    } catch (err) {
      console.error('[API] Hacker News error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/4chan', async (req, res) => {
    try {
      const data = await dedupeRequest('fourchan', fetchFourChan);
      res.json(data);
    } catch (err) {
      console.error('[API] 4chan error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tech', async (req, res) => {
    try {
      const data = await dedupeRequest('tech', fetchTechNews);
      res.json(data);
    } catch (err) {
      console.error('[API] Tech news error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/science', async (req, res) => {
    try {
      const requestedSources = parseRequestedScienceSources(req.query.sources);
      const data = await fetchScienceNews(requestedSources);
      res.json(data);
    } catch (err) {
      console.error('[API] Science news error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log('[DATA] API routes registered: /api/headlines, /api/local, /api/custom, /api/ticker, /api/markets, /api/crypto, /api/macro, /api/weather, /api/radar, /api/predictions, /api/lemmy, /api/open-social, /api/hackernews, /api/4chan, /api/tech, /api/science');
}

module.exports = {
  RSS_FEEDS,
  normalizePolymarketMarket,
  normalizeKalshiMarket,
  selectDiverseItems,
  selectHeadlineItems,
  selectScienceItems,
  selectLocalItems,
  normalizeBlueskyPost,
  normalizeMastodonLink,
  registerRoutes,
  fetchHeadlines,
  fetchLocalNews,
  fetchCustomFeeds,
  fetchTicker,
  fetchMarkets,
  fetchCrypto,
  fetchMacroData,
  fetchWeather,
  fetchRadarData,
  fetchPredictions,
  fetchLemmy,
  fetchOpenSocial,
  fetchHackerNews,
  fetchFourChan,
  fetchTechNews,
  fetchScienceNews,
  isLocalAdOrPromotion,
};
