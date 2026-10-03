const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('service worker leaves third-party map tiles to the browser HTTP cache', () => {
  const listeners = new Map();
  const unexpectedCache = () => { throw new Error('Third-party tile entered the application cache'); };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), {
    URL,
    self: {
      location: { origin: 'http://localhost:3000' },
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    caches: { open: unexpectedCache, match: unexpectedCache },
    fetch: unexpectedCache,
  });
  for (const url of [
    'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/7/49/36',
    'https://tile.openstreetmap.org/7/36/49.png',
    'https://custom-map.example/tiles/7/36/49.png',
  ]) {
    let intercepted = false;
    listeners.get('fetch')({
      request: { url, method: 'GET', mode: 'cors' },
      respondWith: () => { intercepted = true; },
    });
    assert.equal(intercepted, false, url);
  }
});
