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

- **Current-first aggregation** — news uses a seven-day freshness window; slower research, investigations, and civic sources use explicit shared windows. Author publication monitors use 180 days. Older entries retain their real dates.
- **Six-story briefing** — related coverage is clustered into six skimmable storylines when enough current reporting is available.
- **Syndication-aware ranking** — syndicated copies are grouped so repeated wire coverage does not inflate independent-source counts.
- **Text-only article reader** — Mozilla Readability extracts article text without rendering publisher scripts, advertisements, cookie prompts, popups, or embeds.
- **Verified full-text alternatives** — when a publisher exposes only an excerpt, local topic similarity finds related reporting and offers a link only after the reader verifies that the alternative has full text. The reader switches sources only when clicked and preserves both links.
- **Source controls** — individual publishers and communities can be enabled or disabled from settings, with select-all and unselect-all actions.
- **Dedicated science feed** — a separate Science tab combines current science journalism with articles from leading multidisciplinary and medical journals.
- **Dedicated finance feed** — a Finance tab tracks stocks, IPOs, crypto, trade wars, tariffs, and global macroeconomics in one combined feed. BEA, USTR, Federal Register trade documents, SEC registration filings, Bank of Japan, CFTC, and Ethereum Foundation updates complement financial reporting. Relevant general and technology reporting joins the finance feed; source choices persist in Settings.
- **Dedicated local feed** — a separate Local tab covers Washington, DC and Alexandria through local publishers, public radio, city news, and Virginia reporting.
- **Local promotion filtering** — WTOP betting, sportsbook, casino, and prediction-market promotions are removed before local stories are displayed.
- **Open social signals** — integrates Lemmy, Bluesky Discover, Mastodon trending links, Hacker News, and selected 4chan boards without application credentials. All social sources are enabled by default and remain individually selectable in Settings. Existing installations enable them once when upgrading, then preserve subsequent source choices. Social activity dates are labeled separately from article dates, and social discovery does not count as independent briefing reporting.
- **Source provenance and health** — Settings shows delivery failures, recent eligible counts, and source types. Researcher monitors have their own group. Shared articles and coauthored papers appear once with their source/author associations; original reports remain available for source selection and briefing clustering.
- **Expanded coverage** — Daily Maverick and Global Voices add regional perspectives, KFF Health News adds health policy, and WMATA alerts and Alexandria council agendas add actionable local information.
- **Market context** — international indices, euro/yen exchange rates, and euro-area consumer prices complement US indicators. Quotes and macro observations show their dates and units; stock movement is labeled as a fixed watchlist. Prediction entries preserve full questions and end dates, exclude sports/combination contracts, and require a liquid, identified exchange contract.
- **User RSS/Atom feeds** — add any public feed from Settings; the server rejects private hosts, credentials, and non-HTTP(S) URLs.
- **Live context panels** — weather radar, financial markets, cryptocurrency, prediction markets, ticker data, and an interactive geographic globe.
- **Dense interaction model** — keyboard navigation, search, responsive layouts, and persistent draggable pane sizes.

## Quick start

### Requirements

- Node.js 24.18 LTS or Node.js 26+
- npm 11 or newer

### Run locally

```bash
git clone https://github.com/blakepiper/blakenewsnow.git
cd blakenewsnow
./blakenewsnow
```

The launcher keeps an incremental project-local environment in
`.blakenewsnow-venv/`. It installs dependencies there on first use, updates
that environment when the manifest or lockfile changes, and serves the production
frontend and API from one Node process. It builds only when frontend inputs change
and stays attached to your terminal, logging API requests. Press Ctrl+C to stop it.
A second launch reports an existing instance or occupied port instead of attaching
to a server from another terminal. Once the frontend is ready,
it opens `http://localhost:3000` in the default browser; set
`BLAKENEWSNOW_OPEN_BROWSER=0` to disable that behavior.

Open [http://localhost:3000](http://localhost:3000). For development with automatic
frontend and API reloads, use `./blakenewsnow --dev` (frontend `3000`, API `3001`).

No API keys or paid services are required for the currently configured integrations. Public endpoints may still impose their own rate limits or availability rules.

In the October 2026 validation, IMF news feeds rejected requests and its legacy RSS pages returned no entries, so IMF was removed from configured sources. Empty researcher searches are labeled as missing recent indexed publications, not inactive researchers. `npm run audit:sources -- --json=/tmp/source-audit.json` records delivery and eligible-content coverage with the application's actual parsers and freshness rules.

### Run with Guix

From the repository root:

```bash
guix shell -m manifest.scm
npm ci
npm start
```

The manifest supplies Node.js 24.18.0 (including npm), Bash, coreutils, and
CA certificates. Use a Guix channel that provides this Node version; run
`guix pull` if your package definitions are older. `npm start` automatically
opens the app in your default browser once the frontend is ready. Set
`BROWSER=none` to skip opening the browser (for example, `BROWSER=none npm start`).

For the project-local launcher described above, use
`guix shell -m manifest.scm -- ./blakenewsnow` instead of `npm ci` and
`npm start`. The launcher requires that the repository has no existing
`node_modules` directory.

## Configuration

Runtime configuration is provided through environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` in launcher; `3001` in development | Express listening port |
| `CORS_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated frontend origins allowed to call the API |
| `VITE_API_URL` | Same origin in production; `http://localhost:3001` in development | API base URL embedded in the frontend build |
| `SERVE_DIST` | Unset | Set `1` to serve `dist/` with the API |
| `FEED_CACHE_DIR` | `.blakenewsnow-cache/` | Directory for bounded, normalized feed snapshots |

For a split frontend/API deployment, set `VITE_API_URL` before building the frontend and set `CORS_ORIGIN` on the API server to the deployed frontend origin.

Location, source selections, read state, and pane dimensions are stored locally in the browser.

## Performance

Feeds appear as each category responds. A cold RSS category waits at most one second
for upstream work; slow sources continue in the background and the page checks for
completed updates. Valid snapshots survive restarts and are checked against the same
publication windows on every read. Source selections limit upstream requests.
Parsed records are reused until each source's polling interval expires; researcher
provider spacing applies only to actual requests. The snapshot cache is bounded to 12 MiB of serialized records, 512 sources,
and 300 records per source.

Widgets mount only in their active layout and visible sidebar sections. Shared polling
avoids duplicate and overlapping requests, cancels unused requests, pauses while the
page is hidden, and handles conditional HTTP 304 responses. API JSON and production
assets are compressed. Radar retains only current frame tiles, uses one resize observer,
and avoids resetting its canvas on every draw. Reduced motion pauses radar playback.
Feed rows and briefing inputs are memoized; article extraction loads its DOM libraries
only when a reader request needs them.

## Commands

| Command | Purpose |
|---|---|
| `./blakenewsnow` | Launch the cached production build and API |
| `./blakenewsnow --dev` | Launch development servers with automatic reloads |
| `npm start` | Run the API and frontend development servers and open the app in the default browser |
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
| General news | NPR, BBC, CBC News, DW, The Guardian, Al Jazeera, Haaretz (English), ABC News, CBS News, The New York Times, PBS NewsHour, NBC News, Axios, The Hill, Vox, Fox News, Politico, Semafor, The Intercept, ProPublica, Foreign Policy, Breitbart, GDELT, RFI, The Hindu, Indian Express, SCMP, El Pais, Euronews, The New Humanitarian, Daily Maverick, Global Voices, African Arguments, The Conversation |
| Official and verification | White House, Defense.gov, Congress.gov, CISA, NOAA, FDA Press Releases, FDA Recalls, CDC Travel Notices, FactCheck.org, Snopes, ICIJ, Bellingcat |
| Technology | Hacker News, Ars Technica, The Verge, TechCrunch, Wired, Lobsters, MIT Technology Review, BleepingComputer, Rest of World, The Register, 404 Media, KrebsOnSecurity, Dark Reading, IEEE Spectrum, The Markup, GitHub Engineering, GitHub Security, OpenAI News, Google AI, AWS News, Cloudflare |
| Science news | ScienceDaily, Phys.org, Science News, Live Science, Quanta Magazine, NASA, AAAS Science News, APS Psychology, Neuroscience News Psychology, Carbon Brief, Mongabay, STAT, KFF Health News, WHO, Undark |
| Scientific journals | Nature, Science, PNAS, Cell, Science Advances, eLife, PLOS ONE, The Lancet, NEJM, Frontiers in Psychology, Human Factors, Ergonomics |
| Local — DC and Alexandria | WTOP, WAMU, Alexandria City, Alexandria Council, WMATA Alerts, Alexandria Times, ALXnow, Virginia Mercury, Washington Post Local, DC News Now, Washington City Paper, Washington Blade |
| Social | Lemmy communities, Bluesky Discover, Mastodon trending links, 4chan `/news/`, `/pol/`, `/lit/`, and `/his/` |
| Finance reporting | Bloomberg, Financial Times, The Wall Street Journal (Markets), CNBC Economy, CNBC IPOs, CoinDesk, BBC Business, Guardian Business, SEC, Federal Reserve, BLS, EIA, ECB, WTO News |
| Additional primary finance sources | BEA, USTR, Federal Register Trade, SEC IPO Filings, SEC Foreign IPO Filings, Bank of Japan, CFTC, Ethereum Foundation |
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
| `1`–`7` | Change the active feed filter |
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

The API performs network requests to third-party services and stores normalized feed snapshots locally. For an internet-facing deployment, place it behind a production reverse proxy with request rate limits, timeouts, TLS, and normal process supervision.

## Content and privacy

Blake News Now does not redistribute complete publisher pages. Headlines, excerpts, extracted text, and external links remain attributable to their respective sources. Source terms and availability govern upstream content.

Settings and reading state stay in the browser's local storage. The application does not include user accounts or analytics.

## License

Released under the [MIT License](./LICENSE).
