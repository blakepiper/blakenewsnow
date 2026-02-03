# Blake News Now - UX Audit & Improvement Plan

## Executive Summary

The current implementation has solid foundations (keyboard navigation, dark theme, data sources) but suffers from **unnecessary friction in the core user flow**. The sidebar article reader adds a pointless intermediate step - users want to read news, not preview it.

---

## Current UX Problems

### 1. The Sidebar Reader is Friction, Not Value

**The Problem:**
When a user clicks a headline, they see a sidebar with:
- Title (already visible in the list)
- Timestamp (already visible)
- Source (already visible)
- Empty space (no article content - RSS rarely provides it)
- "Read full article" button

**User's Mental Model:**
"I click headline → I read article"

**Current Reality:**
"I click headline → I see the same info in a sidebar → I click again → I read article"

**The Verdict:** Delete the sidebar. Just open articles directly.

---

### 2. Layout Wastes Vertical Space

**Compact Layout Issues:**
- Headlines get ~40% of screen height
- Weather: 140px (useful but large)
- Predictions: 120px (cramped, not scannable)
- Financial: 120px (cramped)
- Ticker: 32px

The most important content (news) gets squeezed.

**Dashboard Layout Issues:**
- 3 equal columns feels arbitrary
- Reddit+HN in middle column means they compete for attention
- No clear visual hierarchy

---

### 3. No Read/Unread Visual State

Users can't tell what they've already seen. The `readArticles` array exists in settings but isn't used in the UI.

---

### 4. Search Opens to Useless Sidebar

Finding a headline via search, then clicking it, opens the same empty sidebar. Double friction.

---

### 5. Filter/Source Selection is Buried

To filter by source, users must:
1. Click settings
2. Find Sources tab
3. Toggle individual sources
4. Close settings

Should be 1 click from the main view.

---

### 6. Reading List is Invisible

Users can save articles (Ctrl+S) but there's no way to view saved items.

---

### 7. Information Hierarchy is Flat

Everything has equal visual weight:
- Breaking news looks the same as 3-day-old content
- High-engagement Reddit posts look the same as low ones
- No visual distinction between sources

---

## What's Working Well

| Feature | Why It Works |
|---------|--------------|
| **Dark theme** | Easy on eyes, appropriate for news dashboard |
| **Keyboard shortcuts** | Power users love j/k navigation |
| **Source color coding** | Quick visual identification |
| **Weather with radar** | Genuinely useful, compact information |
| **Ticker at bottom** | Non-intrusive, ambient information |
| **Search (/)** | Fast, fuzzy matching, keyboard navigable |
| **Loading skeletons** | Good perceived performance |

---

## Proposed UX Improvements

### Phase 1: Remove Friction (High Impact)

#### 1.1 Direct Article Opening
- **Single click** → Opens article in new tab
- **Middle click** → Opens in background tab
- **Ctrl+click** → Opens in background tab
- Remove the sidebar reader entirely

#### 1.2 Visual Read State
- Unread: `text-white/90` (current)
- Read: `text-white/50` with subtle strikethrough or dimming
- Store read state in localStorage (already implemented, just not displayed)

#### 1.3 Quick Filters Bar
Add a horizontal filter bar above headlines:
```
[All] [News] [Tech] [Reddit] [HN] [Saved ★]
```
One click to filter. No settings menu needed.

---

### Phase 2: Better Information Hierarchy

#### 2.1 Time-Based Grouping
```
── Today ──────────────────────
  Headlines from today...

── Yesterday ──────────────────
  Headlines from yesterday...

── This Week ──────────────────
  Older headlines...
```

#### 2.2 Engagement Indicators
For Reddit/HN, show engagement visually:
- 🔥 Hot (>1000 upvotes)
- High comment count badge
- Trending indicator

#### 2.3 Breaking News Treatment
- Red left border for "breaking" category
- Slightly larger text
- Pin to top option

---

### Phase 3: Layout Rethinking

#### 3.1 New Default Layout: "Feed Focus"
```
┌─────────────────────────────────────────────────────┐
│ [Logo]  [Filter Pills]              [🔍] [⚙️]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HEADLINES (Full width, scrollable)                 │
│  ───────────────────────────────────                │
│  • NPR    Trump announces... (2m ago)              │
│  • BBC    UK parliament... (5m ago)                │
│  • r/news Breaking: Major... (12m ago) 🔥 2.4k    │
│  • HN     Show HN: I built... (1h ago) 847 pts    │
│  ...                                                │
│                                                     │
├────────────────────┬────────────────────────────────┤
│ WEATHER            │ MARKETS        │ PREDICTIONS   │
│ 72°F Sunny         │ SPX +0.5%     │ Election 52%  │
│ [radar]            │ BTC $67,234   │ Fed rate 78%  │
└────────────────────┴────────────────────────────────┘
│              ◆ Scrolling Ticker ◆                   │
└─────────────────────────────────────────────────────┘
```

Key changes:
- Headlines get 70%+ of vertical space
- Weather/Markets/Predictions in a single row at bottom
- Filter pills always visible
- Cleaner visual hierarchy

#### 3.2 Collapsible Bottom Panel
- Click to collapse Weather/Markets row
- Headlines expand to full height
- Remember preference

---

### Phase 4: Power User Features

#### 4.1 Saved Articles View
- Add "Saved" to filter pills
- Show reading list with timestamps
- "Clear all" option

#### 4.2 Source Priority
- Drag to reorder sources
- Higher priority = appears first when same timestamp

#### 4.3 Quick Actions on Hover
```
┌──────────────────────────────────────────────────┐
│ • NPR  Trump announces... (2m ago)    [↗] [★] [×]│
└──────────────────────────────────────────────────┘
         Open   Save   Hide
```

#### 4.4 "Mark All as Read"
- Keyboard shortcut (Shift+R?)
- Button in header
- Per-section option

---

## Implementation Priority

### Must Have (Phase 1) - COMPLETED
1. ✅ Remove sidebar, open articles directly
2. ✅ Add visual read/unread state
3. ✅ Add filter pills bar
4. ✅ Middle-click / Ctrl+click support

**Implemented Changes:**
- Removed ArticleReader sidebar component from the UI
- Headlines now open directly in a new tab on click
- Read articles are dimmed (opacity-60, lighter text)
- Saved articles show a ★ indicator
- Filter pills (All/News/Tech/Social/Saved) in header
- Middle-click and Ctrl+click supported via `<a>` elements
- Search results also open directly in new tabs

### Should Have (Phase 2)
5. Time-based grouping
6. Engagement indicators for social
7. Breaking news treatment

### Nice to Have (Phase 3-4)
8. New "Feed Focus" layout
9. Collapsible bottom panel
10. Quick actions on hover
11. Mark all as read

---

## Mockup: New Feed Focus Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Blake News Now          [All][News][Tech][Social][★]  [🔍][⚙️] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ TODAY                                                           │
│ ─────────────────────────────────────────────────────────────── │
│ ● NPR      Trump administration announces new policy    2m     │
│ ● BBC      UK Prime Minister addresses parliament       5m     │
│ ○ r/news   Major earthquake hits California 🔥         12m     │
│ ○ HN       Show HN: I built a news aggregator  847pts  1h      │
│ ● Guardian Climate summit reaches agreement             2h      │
│                                                                 │
│ YESTERDAY                                                       │
│ ─────────────────────────────────────────────────────────────── │
│ ○ NY Times Fed signals rate decision coming             18h     │
│ ○ Ars      Apple announces new MacBook Pro              20h     │
│                                                                 │
├───────────────────┬─────────────────┬───────────────────────────┤
│ 72°F Sunny ☀️     │ SPX 5,234 +0.5% │ Election: Trump 52%       │
│ Alexandria, VA    │ BTC $67,234 +2% │ Fed Rate Cut: 78%         │
│ [▓▓░░] radar      │ ETH $3,456 +1%  │ AI Regulation: 34%        │
└───────────────────┴─────────────────┴───────────────────────────┘
│ ◆ BREAKING: Senate passes... ◆ Fed announces... ◆ Apple...     │
└─────────────────────────────────────────────────────────────────┘

Legend: ● = unread, ○ = read, 🔥 = hot/trending
```

---

## Technical Changes Required

### Phase 1 Changes (COMPLETED)

**src/components/FilterPills.tsx** (NEW)
- Filter pills component with All/News/Tech/Social/Saved options
- Shows saved count badge on Saved filter

**src/components/Headlines.tsx** (MODIFIED)
- Changed from `<div>` to `<a>` elements for proper link behavior
- Added `onClick` handler that opens articles directly in new tab
- Added `onAuxClick` handler for middle-click support
- Added read/unread visual states (opacity, lighter text)
- Added saved indicator (★)
- Added filtering by category

**src/App.tsx** (MODIFIED)
- Removed ArticleReader import and usage
- Added FilterPills to header (desktop) and below header (mobile)
- Added filter state management
- Search now opens articles directly instead of sidebar

**src/components/index.ts** (MODIFIED)
- Removed ArticleReader export
- Added FilterPills export

### Phase 2-4 Changes (Future)
- Combine Weather/Markets/Predictions into single row
- Give Headlines more vertical space
- Make bottom row collapsible
- Time-based grouping

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Clicks to read article | 2 | 1 |
| Time to find specific topic | ~10s (search) | ~3s (filter) |
| Visible headlines | ~8-10 | ~15-20 |
| User knows read state | No | Yes |

---

## Next Steps

1. Get approval on this plan
2. Implement Phase 1 (friction removal)
3. User test the changes
4. Iterate on Phase 2-4 based on feedback
