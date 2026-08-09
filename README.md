# Blake News Now

<p align="center">
  <img src="./public/brand-logo.png" alt="Blake News Now" width="720">
</p>

<p align="center">
  A high-density dashboard for current news, social signals, markets, weather, and prediction data.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#data-sources">Data sources</a> ·
  <a href="./LICENSE">MIT License</a>
</p>

## Overview

Blake News Now brings time-sensitive information into a single, keyboard-friendly interface. It aggregates current reporting, scientific publications, and public social signals, removes stale and duplicate entries, and presents the result alongside weather, market, and prediction data.

The application is self-hosted and credential-free by default. Its **What's Happening Now** briefing runs entirely in the browser using local TF-IDF similarity, event clustering, and extractive ranking. It does not send stories to an LLM or another AI service.

## Features

- **Current-first aggregation** — RSS, Atom, RDF, and public APIs are normalized behind a seven-day freshness policy.
- **Six-story briefing** — related coverage is clustered into six skimmable storylines when enough current reporting is available.
- **Syndication-aware ranking** — syndicated copies are grouped so repeated wire coverage does not inflate independent-source counts.
- **Text-only article reader** — Mozilla Readability extracts article text without rendering publisher scripts, advertisements, cookie prompts, popups, or embeds.
- **Verified full-text alternatives** — when a publisher exposes only an excerpt, local topic similarity finds related reporting and offers a link only after the reader verifies that the alternative has full text. The reader switches sources only when clicked and preserves both links.
- **Source controls** — individual publishers and communities can be enabled or disabled from settings, with select-all and unselect-all actions.
- **Dedicated science feed** — a separate Science tab combines current science journalism with articles from leading multidisciplinary and medical journals.
- **Dedicated local feed** — a separate Local tab covers Washington, DC and Alexandria through local publishers, public radio, city news, and Virginia reporting.
- **Local promotion filtering** — WTOP betting, sportsbook, casino, and prediction-market promotions are removed before local stories are displayed.
- **Open social signals** — integrates Lemmy, Bluesky Discover, Mastodon trending links, Hacker News, and selected 4chan boards without application credentials.
- **User RSS/Atom feeds** — add any public feed from Settings; the server rejects private hosts, credentials, and non-HTTP(S) URLs.
- **Live context panels** — weather radar, financial markets, cryptocurrency, prediction markets, ticker data, and an interactive geographic globe.
- **Dense interaction model** — keyboard navigation, search, responsive layouts, and persistent draggable pane sizes.

## Quick start

### Requirements

- Node.js 24.18 LTS or Node.js 26+
- npm 10 or newer

### Run locally

```bash
git clone https://github.com/blakepiper/blakenewsnow.git
cd blakenewsnow
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). The Vite frontend runs on port `3000` and the Express API runs on port `3001`.

No API keys or paid services are required for the currently configured integrations. Public endpoints may still impose their own rate limits or availability rules.

## Configuration

Runtime configuration is provided through environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Express API port |
| `CORS_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated frontend origins allowed to call the API |
| `VITE_API_URL` | `http://localhost:3001` | API base URL embedded in the frontend build |

For a split frontend/API deployment, set `VITE_API_URL` before building the frontend and set `CORS_ORIGIN` on the API server to the deployed frontend origin.

Location, source selections, read state, and pane dimensions are stored locally in the browser.

## Commands

| Command | Purpose |
|---|---|
| `npm start` | Run the API and frontend development servers |
| `npm run dev` | Run the Vite frontend only |
| `npm run server` | Run the Express API only |
| `npm run server:watch` | Run the API with automatic restarts |
| `npm run build` | Type-check and create the production frontend bundle |
| `npm run preview` | Preview the production frontend bundle |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run deterministic unit and regression tests |
| `npm run test:api` | Exercise live API endpoints; requires the API server |
| `npm run test:all` | Run lint, unit tests, and live API diagnostics |
| `npm run audit:sources` | Check configured RSS and Atom feeds for health and freshness |

## How stories reach the display

The server and client apply complementary validation:

1. Fetch configured feeds concurrently and coalesce simultaneous requests.
2. Parse RSS, Atom, and RDF feeds, including namespaced dates and alternate links.
3. Reject invalid URLs, missing or invalid dates, future timestamps, and entries older than the source's freshness window. Most sources use seven days; slower official and journal feeds use a longer source-specific window.
4. Infer dates only from recognized date-bearing article URL patterns when a feed omits them.
5. Normalize titles and remove repeated or substantially matching entries.
6. Balance publishers before filling remaining capacity so one high-volume source cannot dominate.
7. Apply the user's source selection before response limits are calculated.
8. Cluster related reporting locally for the six-cell briefing.

The reader is deliberately separate from the publisher page. It only returns extracted text and safe metadata. It blocks private and local network destinations and does not attempt to bypass authentication or paywalls.

## Data sources

| Category | Sources |
|---|---|
| General news | NPR, BBC, CBC News, DW, The Guardian, Al Jazeera, ABC News, CBS News, The New York Times, Bloomberg, Financial Times, The Wall Street Journal, PBS NewsHour, NBC News, Axios, The Hill, Vox, Fox News, Politico, Semafor, The Intercept, ProPublica, Foreign Policy, Breitbart, GDELT, RFI, The Hindu, Indian Express, SCMP, El Pais, Euronews, The New Humanitarian, African Arguments, The Conversation |
| Official and verification | White House, Defense.gov, Congress.gov, CISA, NOAA, SEC, Federal Reserve, BLS, EIA, FDA Press Releases, FDA Recalls, CDC Travel Notices, FactCheck.org, Snopes, ICIJ, Bellingcat |
| Technology | Hacker News, Ars Technica, The Verge, TechCrunch, Wired, Lobsters, MIT Technology Review, BleepingComputer, Rest of World, The Register, 404 Media, KrebsOnSecurity, Dark Reading, IEEE Spectrum, The Markup, GitHub Engineering, GitHub Security, OpenAI News, Google AI, AWS News, Cloudflare |
| Science news | ScienceDaily, Phys.org, Science News, Live Science, Quanta Magazine, NASA, AAAS Science News, APS Psychology, Neuroscience News Psychology, Carbon Brief, Mongabay, STAT, WHO, Undark, USGS Earthquakes |
| Scientific journals | Nature, Science, PNAS, Cell, Science Advances, eLife, PLOS ONE, The Lancet, NEJM, Frontiers in Psychology, Human Factors, Ergonomics |
| Local — DC and Alexandria | WTOP, WAMU, Alexandria City, Alexandria Times, ALXnow, Virginia Mercury, Washington Post Local, DC News Now, Washington City Paper, Washington Blade |
| Social | Lemmy communities, Bluesky Discover, Mastodon trending links, 4chan `/news/`, `/pol/`, and `/lit/` |
| Markets and macro | Yahoo Finance, CoinGecko, FRED |
| Predictions | Polymarket, Kalshi, pizzint.watch |
| Weather | National Weather Service, RainViewer |

All configured news sources use public RSS, Atom, HTML, or anonymous public endpoints. AP, Reuters, and Metaculus are not enabled as direct sources because their official machine-access paths require authentication; the app uses free public alternatives instead. Upstream availability and response formats can change without notice. Run `npm run audit:sources` when diagnosing missing or stale content.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `j` or `↓` | Select the next story |
| `k` or `↑` | Select the previous story |
| `Enter` | Open the selected story in the text reader |
| `/` | Open search |
| `?` | Show keyboard shortcuts |
| `Ctrl+,` | Open settings |
| `1`–`6` | Change the active feed filter |
| `Esc` | Close the active dialog |

## Architecture

```text
src/
  components/           Dashboard panels and dialogs
  hooks/                Feed orchestration, settings, and keyboard behavior
  ml/                   Local clustering and extractive briefing logic
  stores/               Browser-persisted settings
  utils/                Formatting and geographic projection helpers
  App.tsx               Application layout and interaction wiring
  theme.ts              MUI theme

server/
  article-preview.cjs   Safe fetching and readable-text extraction
  data-feeds.cjs        Feed integrations, normalization, caching, and routes
  rss.cjs               RSS, Atom, and RDF parsing with freshness enforcement
  proxy.cjs             Express server and restricted radar-tile proxy

tests/
  *.test.cjs            Server, parser, feed, and security regressions
  *.test.ts             Client logic, settings, briefing, and projection tests
  diagnostic.cjs        Live API diagnostics
```

### Technology

- React 19 and TypeScript
- Material UI 9 with Emotion
- Tailwind CSS 4
- Vite 8
- Express 5
- Mozilla Readability and jsdom

## Deployment notes

`npm run build` produces the static frontend in `dist/`. Serve that directory through a static host and run `npm run server` as a separate Node.js service.

The API performs network requests to third-party services and keeps short-lived data in memory. For an internet-facing deployment, place it behind a production reverse proxy with request rate limits, timeouts, TLS, and normal process supervision.

## Content and privacy

Blake News Now does not redistribute complete publisher pages. Headlines, excerpts, extracted text, and external links remain attributable to their respective sources. Source terms and availability govern upstream content.

Settings and reading state stay in the browser's local storage. The application does not include user accounts or analytics.

## License

Released under the [MIT License](./LICENSE).
