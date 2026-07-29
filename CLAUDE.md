# Blake News Now

Repository guidance for coding agents.

## Development

```bash
npm install
npm start
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Recommended Node version: 24.18 LTS (see `.nvmrc`); Node.js 26+ is also supported

Run `npm run lint`, `npm run test:unit`, and `npm run build` before handing off changes.
`npm run test:api` and `npm run audit:sources` contact live upstream services.

## Stack

- React 19 and TypeScript
- Vite 8
- Material UI 9 with Emotion's `styled()` and `sx` APIs
- Tailwind CSS 4 for dashboard utility styling
- Express 5

Do not reintroduce `@material-ui/*`, `@mui/styles`, JSS `makeStyles`, or React's legacy
`ReactDOM.render` API.

## Architecture

```text
src/
  components/       Dashboard panels and dialogs
  hooks/            Feed orchestration, keyboard controls, and settings
  ml/               Local TF-IDF event clustering and extractive briefing
  stores/           localStorage-backed settings
  theme.ts          MUI theme and component defaults

server/
  article-preview.cjs  Safe article fetching and readable-text extraction
  data-feeds.cjs       Upstream adapters, caching, normalization, and API routes
  rss.cjs              RSS, Atom, RDF, and freshness handling
  proxy.cjs            Express entry point and radar proxy
```

## Feed invariants

- Do not assign the current time to undated content.
- Reject malformed links, future timestamps, and items older than seven days.
- Apply requested source filters before response limits.
- Preserve corroborating reports for the briefing while deduplicating the visible feed.
- Count known syndicated copies as one independent report.
- Keep upstream failures isolated so one source cannot empty an otherwise healthy response.
- Maintain SSRF protections on article preview and radar proxy routes.

## Current social adapters

- Lemmy: `c/news`, `c/world`, `c/technology`, `c/politics`, `c/science`
- Bluesky: public Discover feed
- Mastodon: public trending links
- Hacker News
- 4chan: `/news/`, `/pol/`, `/lit/`

Social sources must remain individually selectable in `src/stores/settings.ts`, normalized to
the shared feed shape, and covered by deterministic tests.

## Current science adapters

- Science reporting: ScienceDaily, Phys.org, Science News, Live Science, Quanta Magazine, NASA, AAAS Science News
- Journals: Nature, Science, PNAS, Cell, Science Advances, eLife, PLOS ONE, The Lancet, NEJM

Science sources are served through `/api/science`, must remain individually selectable in
`src/stores/settings.ts`, and use the same freshness, source-filtering, and failure-isolation
invariants as the general news pool.
