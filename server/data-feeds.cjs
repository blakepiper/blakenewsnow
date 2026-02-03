/**
 * BlakeNewsNow Data Feeds
 * Fetches headlines from RSS and financial data from Yahoo/CoinGecko
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ============================================
// RSS Feed Configuration
// ============================================
const RSS_FEEDS = {
  headlines: [
    { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/topstories' },
    { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
    { name: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
    { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best' },
    { name: 'Associated Press', url: 'https://rsshub.app/apnews/topics/apf-topnews' },
  ],
  tech: [
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
    { name: 'Lobsters', url: 'https://lobste.rs/rss' },
  ],
  ticker: [
    { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
    { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Google Trends', url: 'https://trends.google.com/trending/rss?geo=US' },
    { name: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
  ],
};

// Reddit subreddits to fetch
const REDDIT_SUBREDDITS = ['news', 'worldnews', 'technology'];

// Hacker News API base
const HN_API = 'https://hacker-news.firebaseio.com/v0';


// ============================================
// Simple in-memory cache
// ============================================
const cache = {
  headlines: { data: null, timestamp: 0 },
  tech: { data: null, timestamp: 0 },
  ticker: { data: null, timestamp: 0 },
  markets: { data: null, timestamp: 0 },
  crypto: { data: null, timestamp: 0 },
  weather: { data: null, timestamp: 0 },
  radar: { data: null, timestamp: 0 },
  predictions: { data: null, timestamp: 0 },
  reddit: { data: null, timestamp: 0 },
  hackernews: { data: null, timestamp: 0 },
  geocode: {},  // zip -> {lat, lon} cache
};

const CACHE_TTL = {
  headlines: 60 * 1000,  // 1 minute
  tech: 60 * 1000,       // 1 minute
  ticker: 60 * 1000,     // 1 minute
  markets: 30 * 1000,    // 30 seconds
  crypto: 60 * 1000,     // 1 minute
  weather: 5 * 60 * 1000, // 5 minutes
  radar: 2 * 60 * 1000,   // 2 minutes
  predictions: 60 * 1000, // 1 minute
  reddit: 2 * 60 * 1000,  // 2 minutes
  hackernews: 2 * 60 * 1000, // 2 minutes
};

// Default location (Alexandria, VA - zip 22314)
const DEFAULT_ZIP = '22314';

function isCacheValid(key) {
  return cache[key].data && (Date.now() - cache[key].timestamp) < CACHE_TTL[key];
}

// ============================================
// HTTP Fetch Helper
// ============================================
function fetch(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Too many redirects'));
    }

    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Special User-Agent for Reddit (they block generic ones)
    const isReddit = parsedUrl.hostname.includes('reddit.com');
    const userAgent = isReddit
      ? 'BlakeNewsNow/1.0 (News Aggregator; Contact: github.com/blakenewsnow)'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': userAgent,
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

// ============================================
// RSS Parser (simple XML extraction)
// ============================================
function parseRSS(xml, sourceName) {
  const items = [];

  // Extract items from RSS or Atom feeds
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1] || match[2];

    // Extract title
    const titleMatch = content.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;

    // Extract link
    const linkMatch = content.match(/<link[^>]*>([^<]+)<\/link>|<link[^>]*href="([^"]+)"/i);
    const link = linkMatch ? (linkMatch[1] || linkMatch[2]) : null;

    // Extract pubDate
    const dateMatch = content.match(/<pubDate>([^<]+)<\/pubDate>|<published>([^<]+)<\/published>|<updated>([^<]+)<\/updated>/i);
    const pubDate = dateMatch ? new Date(dateMatch[1] || dateMatch[2] || dateMatch[3]) : new Date();

    // Extract description/summary
    const descMatch = content.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>|<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
    const description = descMatch ? decodeEntities(stripHtml(descMatch[1] || descMatch[2] || '').substring(0, 200)) : '';

    if (title) {
      items.push({
        title,
        link,
        pubDate,
        description,
        source: sourceName,
      });
    }
  }

  return items;
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

// ============================================
// Fetch Headlines
// ============================================
async function fetchHeadlines() {
  if (isCacheValid('headlines')) {
    return cache.headlines.data;
  }

  console.log('[DATA] Fetching headlines...');

  // Fetch all feeds in parallel for speed
  const feedResults = await Promise.all(
    RSS_FEEDS.headlines.map(async (feed) => {
      try {
        const { data } = await fetch(feed.url, { accept: 'application/rss+xml, application/xml, text/xml' });
        const items = parseRSS(data, feed.name);
        console.log(`[DATA] ${feed.name}: ${items.length} items`);
        return items;
      } catch (err) {
        console.error(`[DATA] ${feed.name} failed:`, err.message);
        return [];
      }
    })
  );

  const allItems = feedResults.flat();

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

  const result = unique.slice(0, 20).map((item, idx) => ({
    id: `headline-${idx}`,
    title: item.title,
    source: item.source,
    timestamp: item.pubDate.toISOString(),
    link: item.link,
  }));

  cache.headlines = { data: result, timestamp: Date.now() };
  return result;
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
        const { data } = await fetch(feed.url, { accept: 'application/rss+xml, application/xml, text/xml' });
        return parseRSS(data, feed.name);
      } catch (err) {
        console.error(`[DATA] Ticker ${feed.name} failed:`, err.message);
        return [];
      }
    })
  );

  const allItems = feedResults.flat();

  // Sort by date and take recent items
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  const result = allItems.slice(0, 30).map((item, idx) => ({
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
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'META', name: 'Meta' },
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
  results.movers = results.movers.slice(0, 4);

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

  const coins = ['bitcoin', 'ethereum', 'solana', 'dogecoin'];
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
async function fetchPredictions() {
  if (isCacheValid('predictions')) {
    return cache.predictions.data;
  }

  console.log('[DATA] Fetching predictions from Polymarket...');

  const url = 'https://gamma-api.polymarket.com/markets?limit=50&active=true&closed=false&order=volume24hr&ascending=false';

  try {
    const { data } = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    const markets = JSON.parse(data);

    // Filter and format markets
    const result = markets
      .filter(m => {
        // Skip sports betting, focus on news-worthy markets
        const q = m.question?.toLowerCase() || '';
        const isSports = q.includes('nba') || q.includes('nfl') || q.includes('mlb') ||
                        q.includes('nhl') || q.includes('ncaa') || q.includes('ufc') ||
                        q.includes('tennis') || q.includes('golf') || q.includes('soccer') ||
                        q.includes('football') || q.includes('basketball') || q.includes('baseball') ||
                        q.includes('hockey') || q.includes('f1') || q.includes('formula') ||
                        q.includes('nascar') || q.includes('pga') || q.includes('boxing') ||
                        q.includes('mma') || q.includes('wrestling') || q.includes('olympics') ||
                        q.includes(' vs ') || q.includes(' vs. ') ||  // "Team A vs Team B" pattern
                        q.includes('warriors') || q.includes('lakers') || q.includes('celtics') ||
                        q.includes('cavaliers') || q.includes('magic') || q.includes('timberwolves') ||
                        q.includes('knicks') || q.includes('bulls') || q.includes('heat') ||
                        q.includes('mavs') || q.includes('mavericks') || q.includes('spurs') ||
                        q.includes('nuggets') || q.includes('suns') || q.includes('clippers') ||
                        q.includes('chiefs') || q.includes('eagles') || q.includes('patriots') ||
                        q.includes('cowboys') || q.includes('packers') || q.includes('ravens') ||
                        q.includes('super bowl') || q.includes('world series') || q.includes('stanley cup') ||
                        q.includes('march madness') || q.includes('playoffs') || q.includes('championship');
        if (isSports) return false;
        if (m.volume24hr < 20000) return false; // Min $20k 24h volume

        // Filter out near-certain outcomes (boring)
        const prices = JSON.parse(m.outcomePrices || '[0.5, 0.5]');
        const yesPrice = parseFloat(prices[0]);
        if (yesPrice < 0.02 || yesPrice > 0.98) return false; // Skip 0-2% or 98-100%

        return true;
      })
      .slice(0, 8)
      .map(m => {
        const outcomes = JSON.parse(m.outcomes || '["Yes", "No"]');
        const prices = JSON.parse(m.outcomePrices || '[0.5, 0.5]');

        // Find the "Yes" price (usually first outcome)
        const yesIndex = outcomes.findIndex(o => o.toLowerCase() === 'yes');
        const yesPrice = yesIndex >= 0 ? parseFloat(prices[yesIndex]) : parseFloat(prices[0]);

        return {
          id: m.id,
          question: truncateQuestion(m.question),
          yesPrice: Math.round(yesPrice * 100), // Convert to percentage
          volume24h: m.volume24hr,
          volumeDisplay: formatVolume(m.volume24hr),
          slug: m.slug,
          category: categorizeMarket(m.question),
        };
      });

    cache.predictions = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error('[POLYMARKET]', err.message);
    return cache.predictions.data || [];
  }
}

function truncateQuestion(q) {
  if (!q) return '';
  // Remove common prefixes
  let clean = q
    .replace(/^Will /i, '')
    .replace(/^Is /i, '')
    .replace(/\?$/, '');

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
        const { data } = await fetch(feed.url, { accept: 'application/rss+xml, application/xml, text/xml' });
        const items = parseRSS(data, feed.name);
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

  const result = unique.slice(0, 30).map((item, idx) => ({
    id: `tech-${idx}`,
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
// Fetch Reddit Posts
// ============================================
async function fetchReddit() {
  if (isCacheValid('reddit')) {
    return cache.reddit.data;
  }

  console.log('[DATA] Fetching Reddit...');

  const results = [];

  for (const subreddit of REDDIT_SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`;
      const { data } = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const json = JSON.parse(data);
      const posts = json.data?.children || [];

      for (const post of posts) {
        const d = post.data;
        // Skip stickied posts and self posts without much content
        if (d.stickied) continue;

        results.push({
          id: d.id,
          title: d.title,
          source: `r/${subreddit}`,
          subreddit,
          score: d.score,
          comments: d.num_comments,
          url: d.url,
          permalink: `https://reddit.com${d.permalink}`,
          timestamp: new Date(d.created_utc * 1000).toISOString(),
          isExternal: !d.is_self,
          thumbnail: d.thumbnail && d.thumbnail.startsWith('http') ? d.thumbnail : null,
        });
      }
    } catch (err) {
      console.error(`[REDDIT] r/${subreddit} failed:`, err.message);
    }
  }

  // Sort by score and recency
  results.sort((a, b) => {
    const scoreWeight = 0.7;
    const timeWeight = 0.3;
    const aAge = (Date.now() - new Date(a.timestamp).getTime()) / 3600000; // hours
    const bAge = (Date.now() - new Date(b.timestamp).getTime()) / 3600000;
    const aScore = (a.score / 1000) * scoreWeight - aAge * timeWeight;
    const bScore = (b.score / 1000) * scoreWeight - bAge * timeWeight;
    return bScore - aScore;
  });

  const result = results.slice(0, 30);
  cache.reddit = { data: result, timestamp: Date.now() };
  return result;
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
// Express Route Handlers
// ============================================
function registerRoutes(app) {
  app.get('/api/headlines', async (req, res) => {
    try {
      const data = await fetchHeadlines();
      res.json(data);
    } catch (err) {
      console.error('[API] Headlines error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ticker', async (req, res) => {
    try {
      const data = await fetchTicker();
      res.json(data);
    } catch (err) {
      console.error('[API] Ticker error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/markets', async (req, res) => {
    try {
      const data = await fetchMarkets();
      res.json(data);
    } catch (err) {
      console.error('[API] Markets error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/crypto', async (req, res) => {
    try {
      const data = await fetchCrypto();
      res.json(data);
    } catch (err) {
      console.error('[API] Crypto error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/weather', async (req, res) => {
    try {
      const zip = req.query.zip || DEFAULT_ZIP;
      const data = await fetchWeather(zip);
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
      const data = await fetchRadarData();
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
      const data = await fetchPredictions();
      res.json(data);
    } catch (err) {
      console.error('[API] Predictions error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reddit', async (req, res) => {
    try {
      const data = await fetchReddit();
      res.json(data);
    } catch (err) {
      console.error('[API] Reddit error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/hackernews', async (req, res) => {
    try {
      const data = await fetchHackerNews();
      res.json(data);
    } catch (err) {
      console.error('[API] Hacker News error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tech', async (req, res) => {
    try {
      const data = await fetchTechNews();
      res.json(data);
    } catch (err) {
      console.error('[API] Tech news error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log('[DATA] API routes registered: /api/headlines, /api/ticker, /api/markets, /api/crypto, /api/weather, /api/radar, /api/predictions, /api/reddit, /api/hackernews, /api/tech');
}

module.exports = { registerRoutes, fetchHeadlines, fetchTicker, fetchMarkets, fetchCrypto, fetchWeather, fetchRadarData, fetchPredictions, fetchReddit, fetchHackerNews, fetchTechNews };
