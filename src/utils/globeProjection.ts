const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

export interface GeoCoordinate {
  lat: number;
  lon: number;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude + 540) % 360) - 180;
}

/**
 * Converts a point on an orthographic globe into a geographic coordinate.
 * Screen coordinates are normalized to the globe radius: x points east and
 * y points north. Points outside the unit circle are not on the globe.
 */
export function inverseOrthographic(
  x: number,
  y: number,
  center: GeoCoordinate
): GeoCoordinate | null {
  const radius = Math.hypot(x, y);
  if (radius > 1) return null;
  if (radius < Number.EPSILON) return center;

  const centerLat = center.lat * DEGREES_TO_RADIANS;
  const centerLon = center.lon * DEGREES_TO_RADIANS;
  const angularDistance = Math.asin(radius);
  const sinDistance = Math.sin(angularDistance);
  const cosDistance = Math.cos(angularDistance);

  const latitude = Math.asin(
    cosDistance * Math.sin(centerLat)
      + (y * sinDistance * Math.cos(centerLat)) / radius
  );
  const longitude = centerLon + Math.atan2(
    x * sinDistance,
    radius * Math.cos(centerLat) * cosDistance
      - y * Math.sin(centerLat) * sinDistance
  );

  return {
    lat: latitude * RADIANS_TO_DEGREES,
    lon: normalizeLongitude(longitude * RADIANS_TO_DEGREES),
  };
}

export function interpolateGlobeCenter(
  from: GeoCoordinate,
  to: GeoCoordinate,
  progress: number
): GeoCoordinate {
  const boundedProgress = Math.min(1, Math.max(0, progress));
  const longitudeDelta = normalizeLongitude(to.lon - from.lon);

  return {
    lat: from.lat + (to.lat - from.lat) * boundedProgress,
    lon: normalizeLongitude(from.lon + longitudeDelta * boundedProgress),
  };
}
