# Blake News Now

**Project:** Blake News Now - Dense Information Dashboard
**Version:** 0.4.0

## Quick Start

```bash
npm install
npm start        # Starts API server (3001) + dev server (3000)
```

## Architecture

Dense 3-column layout optimized for information density:

```
┌─────────────────────────────────────────────────────────────┐
│ BNN  [All][News][Tech][Social][Saved]           [🔍][?][⚙]  │
├──────────────────┬─────────────────┬────────────────────────┤
│                  │                 │                        │
│   HEADLINES      │    REDDIT       │    HACKER NEWS         │
│   (50% width)    │    (25%)        │    (25%)               │
│                  │                 │                        │
│   Single-line    │   r/ posts      │   Y stories            │
│   items, dense   │   with scores   │   with points          │
│                  │                 │                        │
├──────────────────┴─────────────────┴────────────────────────┤
│  WEATHER + RADAR  │   PREDICTIONS    │   MARKETS + CRYPTO   │
├─────────────────────────────────────────────────────────────┤
│  ◆ Scrolling Ticker ◆                                       │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- React 17 + TypeScript + Vite
- Material-UI 4.12.4 with a custom dense theme
- Tailwind CSS 4
- Express.js API server

## File Structure

```
src/
├── components/
│   ├── Headlines.tsx      # News headlines (single-line, filterable)
│   ├── Reddit.tsx         # Reddit posts with scores
│   ├── HackerNews.tsx     # HN stories with points
│   ├── Weather.tsx        # Weather + radar
│   ├── Predictions.tsx    # Polymarket + pizzint.watch predictions
│   ├── Financial.tsx      # Markets + crypto
│   ├── Ticker.tsx         # Scrolling ticker
│   ├── FilterPills.tsx    # Quick filters (All/News/Tech/Social/Saved)
│   ├── SearchBar.tsx      # Global search (/)
│   ├── Settings.tsx       # Settings modal
│   ├── KeyboardHelp.tsx   # Keyboard shortcuts help
│   └── index.ts
├── hooks/
│   ├── useSettings.ts     # Settings state management
│   ├── useKeyboard.ts     # Keyboard shortcut handling
│   └── index.ts
├── stores/
│   └── settings.ts        # localStorage persistence
├── config.ts              # API URLs, refresh intervals
├── App.tsx                # Main layout
└── main.tsx

server/
├── proxy.cjs              # Express API server
├── rss.cjs                # RSS/Atom parsing and freshness policy
└── data-feeds.cjs         # Reddit, HN, 4chan, weather, markets, predictions APIs
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/headlines | Current news from 18 RSS feeds |
| GET /api/reddit | Reddit posts from r/news, r/worldnews, r/technology |
| GET /api/hackernews | Hacker News top stories |
| GET /api/4chan | 4chan threads from /news/ and /pol/ (5+ replies, sorted by engagement) |
| GET /api/weather?zip=XXXXX | Weather + forecast |
| GET /api/radar | RainViewer radar frames |
| GET /api/markets | Stock indices + movers |
| GET /api/crypto | Cryptocurrency prices |
| GET /api/predictions | Polymarket + pizzint.watch predictions (30 items, deduplicated) |
| GET /api/ticker | Scrolling ticker content |
| GET /health | Server health check |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next headline |
| `k` / `↑` | Previous headline |
| `Enter` | Open article in new tab |
| `/` | Search |
| `?` | Keyboard shortcuts |
| `Ctrl+,` | Settings |
| `Ctrl+S` | Save/unsave article |
| `1-5` | Jump to section |
| `Esc` | Close modal |

## Features

- **Direct article opening**: Click → new tab (no preview sidebar)
- **Read/unread state**: Read articles dimmed, persisted in localStorage
- **Filter pills**: Quick filter by category (News/Tech/Social/Saved)
- **Dense layout**: Single-line items, maximum information density
- **Keyboard navigation**: Full keyboard support for power users
- **Live data**: Auto-refresh for all data sources

## Progress Tracking

### Completed
- [x] Settings/preferences system (localStorage)
- [x] Keyboard navigation (j/k, Enter, /, ?, Esc, 1-5)
- [x] Reddit integration (r/news, r/worldnews, r/technology)
- [x] Hacker News integration
- [x] Global search with fuzzy matching
- [x] Filter pills (All/News/Tech/Social/Saved)
- [x] Read/unread visual state
- [x] Direct article opening (removed sidebar preview)
- [x] Dense single-line layout for all feeds
- [x] Compact bottom bar (Weather/Predictions/Markets)
- [x] Config extracted to src/config.ts
- [x] Accessibility improvements (aria-labels, contrast)
- [x] Replaced dead feeds and added a strict seven-day freshness policy
- [x] 4chan integration (/news/, /pol/ — catalog API, 5+ reply filter, rate-limited fetching)
- [x] pizzint.watch geopolitical predictions (scraped from Next.js RSC payload, merged with Polymarket)
- [x] Enhanced Polymarket predictions (lower volume threshold $5k, 25 item limit, 30 total with pizzint)

### TODO
- [ ] Time-based grouping (Today/Yesterday/This Week)
- [ ] Engagement indicators (🔥 for hot posts)
- [ ] Custom RSS feed support
- [ ] Mark all as read
- [ ] Collapsible bottom panel
- [ ] Responsive breakpoints for smaller screens
- [ ] Error boundaries
- [ ] Settings validation/migration

## Data Sources

| Category | Sources |
|----------|---------|
| News | NPR, BBC, Guardian, Al Jazeera, ABC, CBS, NY Times, PBS NewsHour, NBC News, Axios, The Hill, Vox, Fox News, Politico, The Intercept, ProPublica, Foreign Policy, Breitbart |
| Tech | Hacker News, Ars Technica, The Verge, TechCrunch, Wired, Lobsters |
| Social | Reddit (r/news, r/worldnews, r/technology), 4chan (/news/, /pol/) |
| Finance | Yahoo Finance, CoinGecko |
| Predictions | Polymarket (politics, finance, world, general), pizzint.watch (geopolitical) |
| Weather | National Weather Service, RainViewer |
