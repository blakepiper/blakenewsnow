# Blake News Now

A dense, keyboard-friendly dashboard for current news, technology, social posts, markets, weather, and prediction data.

## Start the app

```bash
npm install --legacy-peer-deps
npm start
```

Open [http://localhost:3000](http://localhost:3000). The Express API runs on port 3001.

Set `CORS_ORIGIN` to a comma-separated list of frontend origins when the UI is hosted somewhere else.

`--legacy-peer-deps` is needed because this project intentionally pins the retired Material-UI 4 package line. The installed runtime versions are mutually compatible:

- React 17.0.2
- React DOM 17.0.2
- Material-UI core 4.12.4
- Material-UI icons 4.11.3
- React Three Fiber 7.0.29

## Current-feed guarantees

The server applies the following rules before a headline can reach the display:

- Parse RSS and Atom with `fast-xml-parser`, including namespaced date fields and Atom link attributes.
- Never treat a missing or invalid publication date as the current time.
- Infer a date from common `/YYYY/MM/DD/` article URLs when a feed omits it.
- Reject undated items, invalid links, future timestamps, and stories older than seven days.
- Sort by publication time, newest first.
- Deduplicate repeated titles.
- Coalesce simultaneous requests so several open clients do not stampede upstream feeds.

The client repeats the date, link, and freshness checks as a second line of defense. On desktop, the two-column feed uses row-major order: ranks 1 and 2 share the first row, ranks 3 and 4 share the second, and so on.

## Material-UI 4 learning map

This project uses the v4 package names, not the v5+ `@mui/*` names.

| Concept | Example |
|---|---|
| Theme creation and global defaults | `src/theme.ts` |
| `ThemeProvider`, `StylesProvider`, `CssBaseline` | `src/main.tsx` |
| `makeStyles`, theme tokens, `AppBar`, `Toolbar`, `Tooltip`, `IconButton` | `src/components/Header.tsx` |
| Controlled `Tabs` and `Tab` | `src/components/FilterPills.tsx` |
| `Dialog`, `Switch`, `TextField`, `Button`, component composition | `src/components/Settings.tsx` |

The settings dialog also contains a short in-app MUI notes tab. The visual theme stays intentionally compact and BNN-specific instead of using Material-UI's default appearance.

Useful official v4 references:

- [Material-UI v4 documentation](https://v4.mui.com/)
- [Component customization](https://v4.mui.com/customization/components/)
- [Tabs](https://v4.mui.com/components/tabs/)
- [Theming](https://v4.mui.com/customization/theming/)

## Commands

```bash
npm start          # API and Vite development server
npm run server     # API only
npm run dev        # frontend only
npm run build      # TypeScript and production bundle
npm run lint
npm run test:unit  # RSS parser and freshness regression tests
npm run test:api   # live API diagnostics; requires npm run server
```

## Data sources

News sources currently configured:

- NPR, BBC, Guardian, Al Jazeera
- ABC News, CBS News, NY Times, NBC News
- PBS NewsHour, Axios, The Hill, Vox
- Fox News, Politico, The Intercept, ProPublica
- Foreign Policy, Breitbart

Technology and social sources:

- Ars Technica, The Verge, TechCrunch, Wired, Lobsters
- Hacker News
- Reddit r/news, r/worldnews, and r/technology through one combined Atom feed
- 4chan /news/ and /pol/

Reddit can throttle anonymous RSS traffic with HTTP 403 or 429 responses. The server caches successful responses for five minutes and returns the last good response when available. OAuth is the durable next step.

Other data comes from the National Weather Service, RainViewer, Yahoo Finance, CoinGecko, Polymarket, and pizzint.watch.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `j` or `Down` | Next story |
| `k` or `Up` | Previous story |
| `Enter` | Open selected story |
| `/` | Search |
| `?` | Keyboard shortcuts |
| `Ctrl+,` | Settings |
| `Ctrl+S` | Save selected story |
| `1-5` | Change feed filter |
| `Esc` | Close the active dialog |

## Architecture

```text
src/
  components/       Dashboard surfaces and MUI examples
  hooks/            Feed orchestration, settings, keyboard behavior
  stores/           Local settings persistence
  theme.ts          Material-UI 4 theme
  App.tsx           Main layout and interaction wiring

server/
  data-feeds.cjs    Upstream services, caching, and API routes
  rss.cjs           RSS/Atom parsing and freshness policy
  proxy.cjs         Express server and radar tile proxy

tests/
  rss.test.cjs      Deterministic feed regression tests
  diagnostic.cjs    Live API diagnostics
```

See [AUDIT_2026-07-29.md](./AUDIT_2026-07-29.md) for the revival audit and remaining work.
