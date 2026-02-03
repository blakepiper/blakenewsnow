# Blake News Now

A dense, information-rich news aggregator dashboard for desktop.

## Features

- **Multi-source headlines** from 15+ news sources (RSS, Reddit, Hacker News)
- **Live financial data** - Market indices, crypto prices, stock movers
- **Weather** with animated radar for your location
- **Prediction markets** from Polymarket
- **Maximum density** - Single-line items, 3-column layout, see 40+ headlines at once
- **Full keyboard navigation** - Browse without touching your mouse
- **Search & filters** - Quick filters for News/Tech/Social, fuzzy search
- **Read/unread tracking** - Know what you've already seen
- **Dark theme** - Easy on the eyes

## Screenshot

```
┌─────────────────────────────────────────────────────────────┐
│ BNN  [All][News][Tech][Social][Saved]           [🔍][?][⚙]  │
├──────────────────┬─────────────────┬────────────────────────┤
│ ● NPR   Trump... │ 2.4k news Title │ 847 Show HN: ...   3h │
│ ● BBC   UK par.. │ 1.8k world Post │ 623 Ask HN: ...    5h │
│ ● Guard Climate. │ 956  tech  New  │ 412 Why I built... 2h │
│ ...              │ ...             │ ...                    │
├──────────────────┴─────────────────┴────────────────────────┤
│ ☀️ 72° Alexandria │ POL Trump 52%  │ SPX 5234  +0.5%       │
│ Mon Tue Wed Thu  │ FIN Rate  78%  │ BTC 67234 +2.1%       │
├─────────────────────────────────────────────────────────────┤
│ ◆ BREAKING: Senate passes... ◆ Apple announces...          │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
git clone https://github.com/yourusername/blakenewsnow.git
cd blakenewsnow
npm install
npm start
```

Open http://localhost:5173

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next headline |
| `k` / `↑` | Previous headline |
| `Enter` | Open article in new tab |
| `/` | Search headlines |
| `?` | Show all shortcuts |
| `Ctrl+,` | Open settings |
| `Ctrl+S` | Save article to reading list |
| `Esc` | Close modal |

## Configuration

Click the gear icon (⚙) to open settings:

- **Sources** - Enable/disable news sources
- **Location** - Set your ZIP code for weather
- **Layout** - Switch between compact and dashboard views

## Data Sources

| Category | Sources |
|----------|---------|
| **News** | NPR, BBC, Guardian, Al Jazeera, ABC, CBS, NY Times, Reuters, AP |
| **Tech** | Hacker News, Ars Technica, The Verge, TechCrunch, Wired, Lobsters |
| **Social** | Reddit (r/news, r/worldnews, r/technology) |
| **Finance** | Yahoo Finance, CoinGecko |
| **Predictions** | Polymarket |
| **Weather** | National Weather Service, RainViewer |

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend:** Express.js API server
- **State:** React hooks + localStorage

## Development

```bash
# Run both servers
npm start

# Build for production
npm run build

# Run only the API server
npm run server

# Run only the frontend dev server
npm run dev
```

## License

MIT
