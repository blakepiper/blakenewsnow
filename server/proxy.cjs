/**
 * Blake News Now API Server
 * Serves data APIs for headlines, ticker, weather, markets, and predictions
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const { URL } = require('url');
const path = require('node:path');
const fs = require('node:fs');
const { jsonResponses } = require('./json-response.cjs');
const { registerRoutes: registerDataRoutes } = require('./data-feeds.cjs');
const { registerArticlePreviewRoute } = require('./article-preview.cjs');

const app = express();
const PORT = Number(process.env.PORT) || (process.env.SERVE_DIST === '1' ? 3000 : 3001);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

if (process.env.SERVE_DIST === '1') {
  allowedOrigins.add(`http://localhost:${PORT}`);
  allowedOrigins.add(`http://127.0.0.1:${PORT}`);
}
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  next();
});
app.use(jsonResponses);
app.use(cors({
  exposedHeaders: ['ETag', 'X-Feed-Updating'],
  origin(origin, callback) {
    // Non-browser clients do not send Origin.
    return callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Frame-Options', 'DENY');
  next();
});

// Register data feed API routes (headlines, local, custom, weather, markets, predictions, ticker)
registerDataRoutes(app);
registerArticlePreviewRoute(app);

// Radar tile proxy (to avoid CORS issues with RainViewer)
app.get('/api/radar/tile', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).send('Invalid radar URL');
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'tilecache.rainviewer.com') {
    return res.status(403).send('Invalid radar URL');
  }

  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {
      'User-Agent': 'BlakeNewsNow/1.0',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.set('Content-Type', proxyRes.headers['content-type'] || 'image/png');
    res.set('Cache-Control', 'public, max-age=120');
    proxyRes.pipe(res);
  });

  proxyReq.setTimeout(10000, () => proxyReq.destroy(new Error('Radar request timed out')));
  res.on('close', () => { if (!res.writableEnded) proxyReq.destroy(); });
  proxyReq.on('error', (err) => {
    console.error('[RADAR PROXY]', err.message);
    if (!res.headersSent && !res.destroyed) res.status(502).send('Radar fetch failed');
  });

  proxyReq.end();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (process.env.SERVE_DIST === '1') {
  const dist = path.join(__dirname, '../dist');
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.acceptsEncodings('gzip') !== 'gzip') return next();
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return next(); }
    const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dist + path.sep) || !/\.(?:js|css|html|svg)$/.test(file) || !fs.existsSync(file + '.gz')) return next();
    res.vary('Accept-Encoding');
    res.set('Content-Encoding', 'gzip');
    res.set('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.type(path.extname(file));
    res.sendFile(file + '.gz');
  });
  app.use(express.static(dist, { setHeaders(res, file) {
    res.set('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
  } }));
}

app.listen(PORT, () => {
  console.log(`[SERVER] Blake News Now API running on http://localhost:${PORT}`);
  console.log('[SERVER] Available endpoints:');
  console.log('  - /api/headlines');
  console.log('  - /api/finance');
  console.log('  - /api/local');
  console.log('  - /api/custom');
  console.log('  - /api/tech');
  console.log('  - /api/science');
  console.log('  - /api/lemmy');
  console.log('  - /api/open-social');
  console.log('  - /api/hackernews');
  console.log('  - /api/4chan');
  console.log('  - /api/weather');
  console.log('  - /api/crypto');
  console.log('  - /api/markets');
  console.log('  - /api/macro');
  console.log('  - /api/predictions');
  console.log('  - /api/ticker');
  console.log('  - /api/radar/tile');
  console.log('  - /api/article-preview');
  console.log('  - /health');
});
