# Blake News Now

<p align="center">
  <img src="./public/brand-logo.png" alt="Blake News Now" width="720">
</p>

A dense, keyboard-friendly dashboard for current news, technology, social posts, markets, weather, and prediction data.

The **What's Happening Now** briefing is generated entirely in the browser. It uses TF-IDF
headline vectors, cosine-similarity event clustering, recency, and independent-source diversity
to rank developing storylines. The briefing is extractive: every displayed claim is an actual
linked headline, not generated prose. It does not call an LLM or external ML service.

Clicking a story opens the built-in text-only reader. The server uses Mozilla Readability to
extract the article body and sends plain text to the app; publisher scripts, cookie prompts,
advertising, popups, and embeds are never rendered. The reader does not bypass authentication
or paywalls, and an **Open source** button is always available. When a publisher blocks full
retrieval, the reader falls back to safe page metadata or the excerpt supplied in that
publisher's RSS feed instead of presenting an empty preview.

When another enabled publisher is covering the same event, the reader goes one step further:
it matches related headlines locally, tries those sources in parallel, and displays the first
accessible full-text version. The UI labels the substitution, shows the terms used for the
match, warns that details may differ, and preserves links to both the originally selected
story and the reader source. It does not attempt to defeat authentication or paywalls.

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

## Current-feed guarantees

The server applies the following rules before a headline can reach the display:

- Parse RSS, RDF/RSS 1.0, and Atom with `fast-xml-parser`, including namespaced date fields and Atom link attributes.
- Never treat a missing or invalid publication date as the current time.
- Infer a date from common `/YYYY/MM/DD/` article URLs when a feed omits it.
- Reject undated items, invalid links, future timestamps, and stories older than seven days.
- Sort by publication time, newest first.
- Deduplicate repeated titles.
- Cap each publisher's initial contribution so high-volume feeds cannot monopolize the result.
- Coalesce simultaneous requests so several open clients do not stampede upstream feeds.

The client repeats the date, link, and freshness checks as a second line of defense. On desktop, the two-column feed uses row-major order: ranks 1 and 2 share the first row, ranks 3 and 4 share the second, and so on.

The What's Happening Now panel fills six cells on every feed filter when at least six
current reports are available. Desktop pane dimensions are draggable and persist in
local settings: drag the divider beside the dashboard or the handles below its panes.

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
npm run test:unit  # parser, ranking, reader, and briefing regressions
npm run test:api   # live API diagnostics; requires npm run server
npm run audit:sources # direct health/freshness audit of every RSS/Atom URL
```

## Data sources

News sources currently configured:

- NPR, BBC, CBC News, DW, Guardian, Al Jazeera
- ABC News, CBS News, NY Times, Bloomberg, Financial Times, Wall Street Journal
- NBC News
- PBS NewsHour, Axios, The Hill, Vox
- Fox News, Politico, Semafor, The Intercept, ProPublica
- Foreign Policy, Breitbart

Technology and social sources:

- Ars Technica, The Verge, TechCrunch, Wired, Lobsters
- MIT Technology Review, BleepingComputer, Rest of World, The Register, 404 Media
- Hacker News
- Lemmy c/news, c/world, and c/technology
- 4chan /news/, /pol/, and /lit/

Each news and technology response is capped per publisher before remaining slots are filled, so a high-volume feed cannot monopolize the display. All feed items must carry a valid article URL and a timestamp no more than seven days old. Reddit was removed after repeated anonymous RSS/JSON throttling made it return empty data; Lemmy supplies structured, scored social-news posts without credentials.

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
| `1-4` | Change feed filter |
| `Esc` | Close the active dialog |

## Architecture

```text
src/
  components/       Dashboard surfaces and MUI examples
  hooks/            Feed orchestration, settings, keyboard behavior
  ml/               Local headline clustering and extractive briefing
  stores/           Local settings persistence
  theme.ts          Material-UI 4 theme
  App.tsx           Main layout and interaction wiring

server/
  article-preview.cjs Article fetching, SSRF protection, and readable-text extraction
  data-feeds.cjs    Upstream services, caching, and API routes
  rss.cjs           RSS/Atom parsing and freshness policy
  proxy.cjs         Express server and radar tile proxy

tests/
  article-preview.test.cjs Reader extraction and network-safety tests
  rss.test.cjs      Deterministic feed regression tests
  now-briefing.test.ts  Local ML clustering and extraction tests
  diagnostic.cjs    Live API diagnostics
```
