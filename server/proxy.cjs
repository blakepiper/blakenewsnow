/**
 * Blake News Now API Server
 * Serves data APIs for headlines, ticker, weather, markets, and predictions
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const { URL } = require('url');
const { registerRoutes: registerDataRoutes } = require('./data-feeds.cjs');

const app = express();
const PORT = 3001;

// Enable CORS for all origins (dev only)
app.use(cors());

// Register data feed API routes (headlines, weather, markets, predictions, ticker)
registerDataRoutes(app);

// Radar tile proxy (to avoid CORS issues with RainViewer)
app.get('/api/radar/tile', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  // Only allow RainViewer URLs
  if (!url.startsWith('https://tilecache.rainviewer.com')) {
    return res.status(403).send('Invalid radar URL');
  }

  const parsedUrl = new URL(url);

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

  proxyReq.on('error', (err) => {
    console.error('[RADAR PROXY]', err.message);
    res.status(500).send('Radar fetch failed');
  });

  proxyReq.end();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Blake News Now API running on http://localhost:${PORT}`);
  console.log('[SERVER] Available endpoints:');
  console.log('  - /api/headlines');
  console.log('  - /api/weather');
  console.log('  - /api/markets');
  console.log('  - /api/predictions');
  console.log('  - /api/ticker');
  console.log('  - /api/radar/tile');
  console.log('  - /health');
});
