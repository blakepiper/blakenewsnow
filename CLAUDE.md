# Blake News Now

**Project:** Blake News Now - Dense Information Dashboard
**Version:** 0.2.0

## Quick Start

```bash
npm install
npm start        # Starts API server (3001) + dev server (5173)
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
- React 19 + TypeScript + Vite
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
│   ├── Predictions.tsx    # Polymarket odds
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
└── data-feeds.cjs         # RSS, Reddit, HN, weather, markets APIs
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/headlines | News from RSS feeds |
| GET /api/reddit | Reddit posts from r/news, r/worldnews, r/technology |
| GET /api/hackernews | Hacker News top stories |
| GET /api/weather?zip=XXXXX | Weather + forecast |
| GET /api/radar | RainViewer radar frames |
| GET /api/markets | Stock indices + movers |
| GET /api/crypto | Cryptocurrency prices |
| GET /api/predictions | Polymarket prediction markets |
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
| News | NPR, BBC, Guardian, Al Jazeera, ABC, CBS, NY Times, Reuters, AP |
| Tech | Hacker News, Ars Technica, The Verge, TechCrunch, Wired, Lobsters |
| Social | Reddit (r/news, r/worldnews, r/technology) |
| Finance | Yahoo Finance, CoinGecko |
| Predictions | Polymarket |
| Weather | National Weather Service, RainViewer |
