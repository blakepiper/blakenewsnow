# Blake News Now — Project Evaluation & Improvements

A comprehensive review of the codebase with actionable improvement recommendations, organized by priority and category.

---

## 1. Architecture & Code Organization

### Split `server/data-feeds.cjs` into modules
**Priority: High** | **Effort: Medium**

At 1,384 lines with 29 functions, this file handles RSS parsing, cache management, HTTP fetching, weather, markets, crypto, Reddit, HN, 4chan, predictions, and Express route handlers. It should be split into focused modules:

| Module | Functions | Approx Lines |
|--------|-----------|--------------|
| `server/lib/cache.js` | `getCachedData`, `setCachedData`, cache config | ~40 |
| `server/lib/http.js` | `fetchWithTimeout`, connection pooling, User-Agent | ~60 |
| `server/lib/rss.js` | `parseRSS`, `decodeEntities`, `stripHtml`, `stableId` | ~80 |
| `server/lib/headlines.js` | `fetchHeadlines`, `fetchTickerItems`, feed configs | ~120 |
| `server/lib/social.js` | `fetchRedditPosts`, `fetchHackerNews`, `fetch4chanThreads` | ~200 |
| `server/lib/markets.js` | `fetchMarketData`, `fetchCryptoData` | ~170 |
| `server/lib/weather.js` | `geocodeZip`, `fetchNWSWeather`, `fetchRadarFrames` | ~240 |
| `server/lib/predictions.js` | `fetchPolymarketPredictions`, `fetchPizzintPredictions` | ~180 |
| `server/routes.js` | Express route handlers | ~130 |

### Consolidate duplicate type definitions
**Priority: Medium** | **Effort: Low**

Two type files exist with overlapping concerns:
- `src/types.ts` (17 lines) — `FeedItem`, `MobileView`
- `src/types/index.ts` (60 lines) — `Headline`, `WeatherData`, `ForecastDay`, `StockData`, `CryptoData`, `FinancialData`, `TickerItem`

The `Headline` interface in `src/types/index.ts` overlaps with `FeedItem` in `src/types.ts` (different date types: `Date` vs `string`). Merge into a single `src/types/index.ts` and remove `src/types.ts`.

### Consolidate duplicate utility functions
**Priority: Medium** | **Effort: Low**

`SearchBar.tsx` defines its own `formatTimeAgo` (lines 52–64) and `getSourceColor` (lines 66–86) instead of importing from `src/utils/formatters.ts`. The SearchBar version of `getSourceColor` also has fewer sources (23 vs 28). Fix: delete the duplicates and import from `utils/formatters.ts`.

### Break down `Weather.tsx`
**Priority: Medium** | **Effort: Medium**

At 481 lines, `Weather.tsx` handles data fetching, canvas rendering, tile loading, animation, and UI display. Extract:
- `RadarMap.tsx` — canvas rendering, tile math (`latLonToTile`, `latLonToPixelOffset`), animation controls
- `WeatherConditions.tsx` — current conditions display
- `ForecastTimeline.tsx` — timeline bar UI
- `useRadar.ts` hook — radar data fetching, frame management, animation state

### Migrate backend to TypeScript
**Priority: Low** | **Effort: High**

The frontend is TypeScript but the server uses CommonJS `.cjs` files. Migrating to TypeScript would enable shared type definitions between client and server, catch bugs at compile time, and improve the development experience. This is low priority because it's a large effort with no functional change.

---

## 2. Performance

### Add list virtualization
**Priority: High** | **Effort: Medium**

Headlines, Reddit, and HN feeds render all items to the DOM. With 100+ headlines and auto-refresh, this creates unnecessary DOM nodes. Use `react-window` or `@tanstack/react-virtual` to only render visible items.

### Fix `useUnifiedFeed` dependency issue
**Priority: High** | **Effort: Low**

In `src/hooks/useUnifiedFeed.ts`, `fetchAll` (line 207) depends on `newItemIds` state, which changes every 3 seconds via `setTimeout`. The `useEffect` at line 213 suppresses the exhaustive-deps ESLint rule with a comment. This means the `fetchAll` callback is stale after the first render.

Fix: move the `newItemIds` logic out of the `fetchAll` dependency chain. Use a ref for `newItemIds` instead of including it as a callback dependency, and remove the eslint-disable comment.

### Add `React.memo` to pure components
**Priority: Medium** | **Effort: Low**

These components are pure (output depends only on props) and re-render on every parent update:
- `FeedItem.tsx` — rendered 100+ times in lists
- `FilterPills.tsx` — static between filter changes
- `Ticker.tsx` — only changes on data refresh

### Debounce search and settings saves
**Priority: Medium** | **Effort: Low**

`SearchBar.tsx` filters on every keystroke. `useSettings.ts` writes to localStorage on every state change. Add 150–300ms debounce for both.

### Add HTTP connection pooling on server
**Priority: Medium** | **Effort: Low**

`fetchWithTimeout` in `data-feeds.cjs` creates a new connection for every request. Add `keepAlive: true` to the fetch agent:

```js
const http = require('http');
const https = require('https');
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
```

### Add `compression()` middleware
**Priority: Medium** | **Effort: Low**

Express serves uncompressed JSON responses. Add `compression()` middleware to reduce payload sizes by 60–80% for text-heavy endpoints like `/api/headlines`.

### Implement localStorage cleanup for `readArticles`
**Priority: Medium** | **Effort: Low**

In `src/stores/settings.ts`, `markAsRead` pushes article IDs to `readArticles` with no upper bound (line 150–154). At 100 reads/day, this reaches 36,500 entries after a year. Implement an LRU cap (e.g., keep most recent 5,000 IDs).

### Lazy load non-critical sections
**Priority: Low** | **Effort: Medium**

The Globe component (360 lines, imports three.js) and Weather radar (canvas rendering) are below the fold. Use `React.lazy` + `Suspense` to defer loading until visible.

### Add response caching headers
**Priority: Low** | **Effort: Low**

API responses have no `Cache-Control` or `ETag` headers. Add short-lived cache headers (30s–60s) matching the server-side cache TTLs to reduce redundant fetches from the browser.

---

## 3. Resilience & Error Handling

### Add error boundaries around major sections
**Priority: High** | **Effort: Medium**

Only `Globe.tsx` (lines 276–289) has an error boundary (`GlobeErrorBoundary`). If any other component throws during render, the entire app crashes. Add error boundaries around:
- Each feed column (Headlines, Reddit, HN)
- Bottom bar sections (Weather, Predictions, Financial)
- Modals (Settings, SearchBar, KeyboardHelp)

Each boundary should render a compact "Failed to load [section]" fallback with a retry button.

### Implement circuit breakers for failing upstream services
**Priority: Medium** | **Effort: Medium**

When an upstream API (e.g., CoinGecko, Reddit) goes down, the server retries on every client request, wasting resources and adding latency. Implement a circuit breaker pattern: after N consecutive failures, stop trying for a cooldown period and serve cached data or a clear "unavailable" status.

### Add retry logic with exponential backoff
**Priority: Medium** | **Effort: Low**

API calls in `data-feeds.cjs` fail silently with `catch(() => [])` or `catch(() => null)`. Add 1–2 retries with exponential backoff (1s, 2s) before falling through to the error case. This handles transient network issues.

### Implement stale-while-revalidate
**Priority: Medium** | **Effort: Medium**

The server cache in `data-feeds.cjs` has a hard TTL — once expired, clients wait for a fresh fetch. Implement stale-while-revalidate: serve the stale cached data immediately, then refresh in the background.

### Normalize error return types
**Priority: Low** | **Effort: Low**

Error handling is inconsistent across data functions:
- Some return `null` on failure
- Some return `[]`
- Some return stale cached data
- Some throw

Standardize: always return the last cached value if available, otherwise return a typed empty result. Never return `null` where an array is expected.

### Add offline detection on frontend
**Priority: Low** | **Effort: Low**

No handling for `navigator.onLine` changes. When the user goes offline, feeds silently fail. Add a banner: "You're offline — showing cached data" and pause refresh intervals.

---

## 4. Security

### Restrict CORS origins
**Priority: High** | **Effort: Low**

`server/proxy.cjs` line 16: `app.use(cors())` allows requests from any origin. The comment says "dev only" but there's no environment check. In production, restrict to the actual frontend origin:

```js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));
```

### Add `helmet.js` for security headers
**Priority: High** | **Effort: Low**

No security headers are set. Add `helmet()` middleware for `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.

### Validate user inputs
**Priority: High** | **Effort: Low**

The `/api/weather?zip=` endpoint (line 1306) accepts any string: `req.query.zip || DEFAULT_ZIP`. No format validation. Add:
- ZIP code: `/^\d{5}$/` check
- Reject unexpected query parameters
- Return 400 with a clear error message for invalid inputs

### Sanitize error responses
**Priority: Medium** | **Effort: Low**

Several error handlers return `err.message` directly to the client, which may leak internal details (file paths, stack traces, upstream URLs). Wrap errors in generic messages for the client, log the full error server-side.

### Add rate limiting
**Priority: Medium** | **Effort: Low**

No rate limiting exists on any endpoint. A single client can hammer all endpoints. Add `express-rate-limit`:

```js
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({ windowMs: 60000, max: 120 }));
```

### Replace regex XML parsing with a proper parser
**Priority: Medium** | **Effort: Medium**

`parseRSS` in `data-feeds.cjs` (lines 168–223) uses regex to extract `<item>` and `<entry>` tags from RSS/Atom XML. This is vulnerable to:
- **ReDoS** with malformed/adversarial XML
- Incorrect parsing of CDATA sections, nested tags, or namespaced elements
- No protection against XML bombs

Replace with `fast-xml-parser` or `xml2js`.

---

## 5. Testing & Quality

### Add unit and component tests
**Priority: High** | **Effort: High**

Zero test coverage across 3,749 lines of frontend code and 1,384 lines of server code. The only "tests" are manual diagnostic scripts (`tests/diagnostic.cjs`, `tests/frontend-diagnostic.cjs`).

Set up Vitest + React Testing Library. Priority test targets:
- `useUnifiedFeed` — data fetching, merging, deduplication logic
- `parseRSS` — XML edge cases, malformed input
- `FeedItem` — rendering, click handling, read/unread state
- `formatTimeAgo`, `getSourceColor` — utility functions
- Cache TTL behavior in `data-feeds.cjs`

### Add API integration tests
**Priority: Medium** | **Effort: Medium**

Test each `/api/*` endpoint for:
- Correct response shape and status codes
- Error handling when upstream services are down (mock fetch)
- Cache behavior (first call fetches, second call serves cache)
- Input validation (invalid zip codes, missing params)

Use Vitest or Jest with `supertest`.

### Add E2E tests
**Priority: Low** | **Effort: High**

Add Playwright tests for critical user flows:
- Page loads and shows headlines
- Keyboard navigation (j/k, Enter to open)
- Search filters results
- Settings persist after reload

### Add code formatting
**Priority: Medium** | **Effort: Low**

No Prettier config. Code style is mostly consistent but not enforced. Add `.prettierrc` and format the codebase.

### Add pre-commit hooks
**Priority: Low** | **Effort: Low**

Add Husky + lint-staged to run `prettier --check`, `eslint`, and `tsc --noEmit` before commits.

### Fix version mismatch
**Priority: Low** | **Effort: Trivial**

`package.json` says version `0.1.0`. `CLAUDE.md` says version `0.3.0`. Sync them.

---

## 6. Deployment & Infrastructure

### Create Dockerfile
**Priority: High** | **Effort: Medium**

No containerization. Create a multi-stage Dockerfile:

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json ./
RUN npm ci --production
EXPOSE 3001
CMD ["node", "server/proxy.cjs"]
```

### Add CI pipeline
**Priority: High** | **Effort: Medium**

No GitHub Actions or any CI. Add `.github/workflows/ci.yml`:
- Lint (`eslint`)
- Type check (`tsc --noEmit`)
- Build (`npm run build`)
- Test (once tests exist)
- Run on push to `master` and on PRs

### Create `.env.example` with validation
**Priority: Medium** | **Effort: Low**

No `.env.example` and no environment variable documentation. The server uses hardcoded defaults (e.g., `DEFAULT_ZIP = '30301'`). Create `.env.example` listing all configurable values and add startup validation with clear error messages for missing required vars.

### Add structured logging
**Priority: Medium** | **Effort: Medium**

61 `console.log`/`console.error`/`console.warn` calls across server files. These have no log levels, timestamps, or structured format. Replace with Pino:

```js
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
```

This enables log level filtering, JSON output for log aggregation, and proper timestamps.

### Add monitoring endpoints
**Priority: Low** | **Effort: Low**

The `/health` endpoint exists but returns minimal info. Expand it to include:
- Upstream service status (which feeds are healthy/failing)
- Cache hit rates
- Last successful fetch time per source
- Memory usage

### Add server dev auto-restart
**Priority: Low** | **Effort: Trivial**

No `nodemon` or file watching for the Express server. Developers must manually restart after server code changes. Add `nodemon` to dev dependencies and update the `npm start` script.

---

## 7. Accessibility

### Add focus management for modals
**Priority: High** | **Effort: Medium**

No focus trapping in any modal. When `SearchBar.tsx`, `Settings.tsx`, or `KeyboardHelp.tsx` opens, focus is not trapped inside, and tabbing moves to elements behind the modal. Keyboard-only and screen reader users can interact with hidden content.

Use a focus trap library (e.g., `focus-trap-react`) or implement `inert` on the background content.

### Add ARIA live regions for dynamic content
**Priority: High** | **Effort: Low**

No `aria-live` attributes anywhere in the codebase. When feeds refresh with new items, screen readers receive no notification. Add:
- `aria-live="polite"` on feed containers for new item counts
- `aria-live="assertive"` for error states
- Status announcements for filter changes and search results

### Add `prefers-reduced-motion` support
**Priority: Medium** | **Effort: Low**

No `prefers-reduced-motion` checks. These animations always run:
- Radar frame animation (`Weather.tsx`)
- Globe rotation (`Globe.tsx`)
- Ticker scrolling (`Ticker.tsx`)
- New item highlight pulse

Add `@media (prefers-reduced-motion: reduce)` to disable or simplify animations.

### Improve color contrast
**Priority: Medium** | **Effort: Low**

Several UI elements use low-contrast text (e.g., `text-white/40`, `text-white/50` on dark backgrounds). These fail WCAG AA contrast requirements (4.5:1 for normal text). Audit and raise to at least `text-white/60` or use proper contrast-checked color values.

### Add screen reader announcements for state changes
**Priority: Low** | **Effort: Low**

Actions like marking an article as read, saving to reading list, or changing filters provide no screen reader feedback. Add visually-hidden announcement elements for these state changes.

---

## 8. Features & Enhancements

### Real-time updates via SSE
**Priority: Medium** | **Effort: High**

Currently all feeds poll on intervals. Server-Sent Events (SSE) would reduce latency for new items and eliminate unnecessary polling when nothing has changed. SSE is simpler than WebSockets and sufficient for one-way server-to-client updates.

### Better deduplication
**Priority: Medium** | **Effort: Medium**

Current dedup uses a 50-character title prefix match. This misses near-duplicates with different wording and over-matches short titles. Consider:
- Normalized title comparison (lowercase, strip punctuation)
- URL-based dedup (same article from different RSS feeds)
- Similarity scoring (Jaccard on word sets)

### From the existing TODO list
These are already tracked in `CLAUDE.md` but worth reiterating:
- **Time-based grouping** (Today/Yesterday/This Week) — improves scanability
- **Engagement indicators** (fire icon for hot posts) — helps identify trending content
- **Custom RSS feed support** — user-configurable feed list
- **Mark all as read** — essential for power users
- **Collapsible bottom panel** — reclaim vertical space when not needed
- **Responsive breakpoints** — currently unusable on mobile/tablet
- **Pagination or infinite scroll** — for feeds with 100+ items
- **Content quality scoring** — surface high-signal items

---

## Priority Summary

| Priority | Items | Key Impact |
|----------|-------|------------|
| **Critical** | Fix `useUnifiedFeed` deps, add error boundaries, restrict CORS, input validation | Stability, security |
| **High** | Split data-feeds.cjs, add tests, Dockerfile, CI, helmet.js, focus trapping, ARIA live | Maintainability, deployment, a11y |
| **Medium** | Virtualization, compression, rate limiting, structured logging, debouncing, circuit breakers | Performance, resilience |
| **Low** | TypeScript backend, E2E tests, lazy loading, SSE, pre-commit hooks | Nice-to-have improvements |
