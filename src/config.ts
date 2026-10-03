/**
 * Application Configuration
 * Centralized config values and environment-based settings
 */

// API Configuration
export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

// USGS uses Web Mercator tiles with row (y) before column (x). Fetch directly
// to preserve its daily browser cache; no API key or mapping library is needed.
export const RADAR_BASEMAP = {
  tileUrl: import.meta.env.VITE_RADAR_BASEMAP_URL || 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  attribution: import.meta.env.VITE_RADAR_BASEMAP_ATTRIBUTION || 'USGS The National Map',
  attributionUrl: import.meta.env.VITE_RADAR_BASEMAP_ATTRIBUTION_URL || 'https://www.usgs.gov/programs/national-geospatial-program/national-map',
} as const;

// Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  headlines: 60 * 1000,      // 1 minute
  science: 60 * 1000,        // 1 minute
  ticker: 60 * 1000,         // 1 minute
  markets: 30 * 1000,        // 30 seconds
  crypto: 60 * 1000,         // 1 minute
  weather: 5 * 60 * 1000,    // 5 minutes
  radar: 2 * 60 * 1000,      // 2 minutes
  predictions: 60 * 1000,    // 1 minute
  social: 2 * 60 * 1000,     // 2 minutes
  hackernews: 2 * 60 * 1000, // 2 minutes
  search: 60 * 1000,         // 1 minute
} as const;

// Animation Intervals
export const ANIMATION_INTERVALS = {
  radarFrame: 400,           // 400ms between radar frames
  clock: 1000,               // 1 second clock update
  globeRotation: 5000,       // 5 seconds between city rotations
} as const;

// UI Timing
export const UI_TIMING = {
  feedbackDuration: 2000,    // 2 seconds for transient confirmation messages
  debounceDelay: 300,        // 300ms debounce for search
} as const;

// Default Values
export const DEFAULTS = {
  zip: '22314',
  maxHeadlines: 50,
  maxSocialItems: 45,
  maxHNItems: 30,
} as const;
