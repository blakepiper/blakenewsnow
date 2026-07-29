import assert from 'node:assert/strict';
import test from 'node:test';
import {
  interpolateGlobeCenter,
  inverseOrthographic,
} from '../src/utils/globeProjection.ts';

test('places the focused location at the exact center of the globe', () => {
  const city = { lat: 38.9, lon: -77 };

  assert.deepEqual(inverseOrthographic(0, 0, city), city);
});

test('projects cardinal directions around an equatorial center', () => {
  const center = { lat: 0, lon: 0 };
  const east = inverseOrthographic(0.5, 0, center);
  const north = inverseOrthographic(0, 0.5, center);

  assert.ok(east);
  assert.ok(north);
  assert.ok(Math.abs(east.lat) < 1e-10);
  assert.ok(Math.abs(east.lon - 30) < 1e-10);
  assert.ok(Math.abs(north.lat - 30) < 1e-10);
  assert.ok(Math.abs(north.lon) < 1e-10);
  assert.equal(inverseOrthographic(1, 1, center), null);
});

test('rotates across the antimeridian by the shortest route', () => {
  const halfway = interpolateGlobeCenter(
    { lat: 0, lon: 170 },
    { lat: 20, lon: -170 },
    0.5
  );

  assert.equal(halfway.lat, 10);
  assert.equal(halfway.lon, -180);
});
