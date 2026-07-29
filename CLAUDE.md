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
│ BNN  [All][News][Tech][Social]                  [🔍][?][⚙]  │
├──────────────────┬─────────────────┬────────────────────────┤
│                  │                 │                        │
│   HEADLINES      │  SOCIAL NEWS    │    HACKER NEWS         │
│   (50% width)    │    (25%)        │    (25%)               │
│                  │                 │                        │
│   Single-line    │   c/ posts      │   Y stories            │
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
│   ├── UnifiedFeed.tsx    # News, technology, and social stories
│   ├── HackerNews.tsx     # HN stories with points
│   ├── Weather.tsx        # Weather + radar
│   ├── Predictions.tsx    # Polymarket + pizzint.watch predictions
│   ├── Financial.tsx      # Markets + crypto
│   ├── Ticker.tsx         # Scrolling ticker
│   ├── FilterPills.tsx    # Quick filters (All/News/Tech/Social)
│   ├── SearchBar.tsx      # Global search (/)
│   ├── Settings.tsx       # Settings modal
│   ├── KeyboardHelp.tsx   # Keyboard shortcuts help
│   └── index.ts
├── hooks/
│   ├── useSettings.ts     # Settings state management
│   ├── useKeyboard.ts     # Keyboard shortcut handling
│   └── index.ts
├── ml/
│   └── nowBriefing.ts     # Local TF-IDF event clustering and extractive briefing
├── stores/
│   └── settings.ts        # localStorage persistence
├── config.ts              # API URLs, refresh intervals
├── App.tsx                # Main layout
└── main.tsx

server/
├── proxy.cjs              # Express API server
├── article-preview.cjs    # Safe article fetch and readable-text extraction
├── rss.cjs                # RSS/Atom parsing and freshness policy
└── data-feeds.cjs         # RSS, Lemmy, HN, 4chan, weather, markets, predictions
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/headlines | Current, source-balanced news from 21 RSS feeds |
| GET /api/tech | Current, source-balanced technology news |
| GET /api/lemmy | Lemmy posts from c/news, c/world, c/technology |
| GET /api/hackernews | Hacker News top stories |
| GET /api/4chan | 4chan threads from /news/, /pol/, and /lit/ (5+ replies, sorted by engagement) |
| GET /api/article-preview?url=... | Plain-text article preview with private-network blocking |
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
| `Enter` | Open the selected story in the text reader |
| `/` | Search |
| `?` | Keyboard shortcuts |
| `Ctrl+,` | Settings |
| `1-4` | Jump to section |
| `Esc` | Close modal |

## Features

- **Text-only article preview**: Click → sandboxed reader, with an explicit source link
- **Read/unread state**: Read articles dimmed, persisted in localStorage
- **Filter pills**: Quick filter by category (News/Tech/Social)
- **Dense layout**: Single-line items, maximum information density
- **Keyboard navigation**: Full keyboard support for power users
- **Live data**: Auto-refresh for all data sources

## Progress Tracking

### Completed
- [x] Settings/preferences system (localStorage)
- [x] Keyboard navigation (j/k, Enter, /, ?, Esc, 1-4)
- [x] Federated social-news integration (Lemmy c/news, c/world, c/technology)
- [x] Hacker News integration
- [x] Global search with fuzzy matching
- [x] Filter pills (All/News/Tech/Social)
- [x] Read/unread visual state
- [x] Sandboxed, text-only article preview with source fallbacks
- [x] Dense single-line layout for all feeds
- [x] Compact bottom bar (Weather/Predictions/Markets)
- [x] Config extracted to src/config.ts
- [x] Accessibility improvements (aria-labels, contrast)
- [x] Replaced dead feeds and added a strict seven-day freshness policy
- [x] 4chan integration (/news/, /pol/, /lit/ — catalog API, 5+ reply filter, rate-limited fetching)
- [x] Local What's Happening Now briefing (TF-IDF, cosine clustering, source diversity, extractive output)
- [x] Text-only article previews (Mozilla Readability, related-source substitution, metadata/RSS fallback, no publisher scripts/cookies/embeds)
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
| News | NPR, BBC, CBC News, DW, Guardian, Al Jazeera, ABC, CBS, NY Times, PBS NewsHour, NBC News, Axios, The Hill, Vox, Fox News, Politico, Semafor, The Intercept, ProPublica, Foreign Policy, Breitbart |
| Tech | Hacker News, Ars Technica, The Verge, TechCrunch, Wired, Lobsters, MIT Technology Review, BleepingComputer, Rest of World, The Register, 404 Media |
| Social | Lemmy (c/news, c/world, c/technology), 4chan (/news/, /pol/, /lit/) |
| Finance | Yahoo Finance, CoinGecko |
| Predictions | Polymarket (politics, finance, world, general), pizzint.watch (geopolitical) |
| Weather | National Weather Service, RainViewer |
