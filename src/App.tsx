import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Headlines,
  Weather,
  Financial,
  Predictions,
  Ticker,
  Reddit,
  HackerNews,
  KeyboardHelp,
  SearchBar,
  Settings,
  FilterPills,
} from './components';
import type { FilterType } from './components';
import { useSettings, useKeyboard } from './hooks';
import { API_BASE, REFRESH_INTERVALS } from './config';
import './App.css';

interface Article {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  link?: string;
  description?: string;
  type?: 'headline' | 'reddit' | 'hackernews';
}

function App() {
  const {
    settings,
    toggleSource,
    updateLocation,
    addCustomFeed,
    removeCustomFeed,
    setLayout,
    addToReadingList,
    removeFromReadingList,
    isInReadingList,
    markAsRead,
  } = useSettings();

  // UI State
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Data for search
  const [allHeadlines, setAllHeadlines] = useState<Article[]>([]);
  const headlinesRef = useRef<HTMLDivElement>(null);

  // Section refs for jumping
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch all headlines for search
  useEffect(() => {
    async function fetchAll() {
      try {
        const [headlinesRes, redditRes, hnRes] = await Promise.all([
          fetch(`${API_BASE}/api/headlines`).then(r => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/reddit`).then(r => r.json()).catch(() => []),
          fetch(`${API_BASE}/api/hackernews`).then(r => r.json()).catch(() => []),
        ]);

        const combined = [
          ...headlinesRes.map((h: Article) => ({ ...h, type: 'headline' })),
          ...redditRes.map((r: Article & { permalink?: string }) => ({
            id: r.id,
            title: r.title,
            source: r.source,
            timestamp: r.timestamp,
            link: r.permalink || r.link,
            type: 'reddit',
          })),
          ...hnRes.map((h: Article & { permalink?: string; url?: string }) => ({
            id: h.id,
            title: h.title,
            source: h.source,
            timestamp: h.timestamp,
            link: h.url || h.permalink || h.link,
            type: 'hackernews',
          })),
        ];

        setAllHeadlines(combined);
      } catch (err) {
        console.error('Failed to fetch headlines for search:', err);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVALS.search);
    return () => clearInterval(interval);
  }, []);

  // Scroll selected headline into view
  useEffect(() => {
    if (headlinesRef.current) {
      const items = headlinesRef.current.querySelectorAll('[data-headline]');
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Open article in new tab
  const openArticle = useCallback((article: Article) => {
    if (article.link) {
      window.open(article.link, '_blank', 'noopener,noreferrer');
      markAsRead(article.id);
    }
  }, [markAsRead]);

  const handleNavigateUp = useCallback(() => {
    if (showSearch || showSettings || showKeyboardHelp) return;
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, [showSearch, showSettings, showKeyboardHelp]);

  const handleNavigateDown = useCallback(() => {
    if (showSearch || showSettings || showKeyboardHelp) return;
    setSelectedIndex(prev => Math.min(allHeadlines.length - 1, prev + 1));
  }, [showSearch, showSettings, showKeyboardHelp, allHeadlines.length]);

  const handleSelect = useCallback(() => {
    if (showSearch || showSettings || showKeyboardHelp) return;
    const article = allHeadlines[selectedIndex];
    if (article) {
      openArticle(article);
    }
  }, [showSearch, showSettings, showKeyboardHelp, allHeadlines, selectedIndex, openArticle]);

  const handleSearch = useCallback(() => {
    if (showSettings || showKeyboardHelp) return;
    setShowSearch(true);
  }, [showSettings, showKeyboardHelp]);

  const handleEscape = useCallback(() => {
    if (showKeyboardHelp) {
      setShowKeyboardHelp(false);
    } else if (showSearch) {
      setShowSearch(false);
    } else if (showSettings) {
      setShowSettings(false);
    }
  }, [showKeyboardHelp, showSearch, showSettings]);

  const handleHelp = useCallback(() => {
    setShowKeyboardHelp(prev => !prev);
  }, []);

  const handleSection = useCallback((section: number) => {
    const ref = sectionRefs.current[section - 1];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const handleSave = useCallback(() => {
    const article = allHeadlines[selectedIndex];
    if (article) {
      if (isInReadingList(article.id)) {
        removeFromReadingList(article.id);
      } else {
        addToReadingList(article.id);
      }
    }
  }, [allHeadlines, selectedIndex, isInReadingList, addToReadingList, removeFromReadingList]);

  const handleSelectFromSearch = useCallback((result: Article) => {
    openArticle(result);
    setShowSearch(false);
  }, [openArticle]);

  // Keyboard navigation
  useKeyboard({
    onNavigateUp: handleNavigateUp,
    onNavigateDown: handleNavigateDown,
    onSelect: handleSelect,
    onSearch: handleSearch,
    onEscape: handleEscape,
    onHelp: handleHelp,
    onSection: handleSection,
    onSettings: handleSettings,
    onSave: handleSave,
  });

  const isDashboard = settings.layout === 'dashboard';

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col text-xs">
      {/* Compact Header */}
      <div className="h-7 shrink-0 border-b border-white/10 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h1 className="text-white font-medium text-sm">BNN</h1>
          <FilterPills
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            savedCount={settings.readingList.length}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(true)}
            className="text-white/50 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Search"
            title="Search (/)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="text-white/50 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Shortcuts"
            title="Shortcuts (?)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-white/50 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Settings"
            title="Settings (Ctrl+,)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content - Dense 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {isDashboard ? (
          // Dashboard: 3 equal columns
          <div className="flex-1 grid grid-cols-3 gap-px bg-white/10">
            <div ref={el => { sectionRefs.current[0] = el; }} className="bg-[#0a0a0a] overflow-hidden">
              <Headlines
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
                onMarkAsRead={markAsRead}
                readArticles={settings.readArticles}
                savedArticles={settings.readingList}
                filter={activeFilter}
              />
            </div>
            <div className="bg-[#0a0a0a] overflow-hidden flex flex-col">
              <div ref={el => { sectionRefs.current[1] = el; }} className="flex-1 overflow-hidden border-b border-white/10">
                <Reddit
                  onSelectPost={(post) => {
                    if (post.permalink) {
                      window.open(post.permalink, '_blank', 'noopener,noreferrer');
                      markAsRead(post.id);
                    }
                  }}
                  maxItems={25}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <HackerNews
                  onSelectStory={(story) => {
                    const url = story.url || story.permalink;
                    if (url) {
                      window.open(url, '_blank', 'noopener,noreferrer');
                      markAsRead(story.id);
                    }
                  }}
                  maxItems={25}
                />
              </div>
            </div>
            <div className="bg-[#0a0a0a] overflow-hidden flex flex-col">
              <div ref={el => { sectionRefs.current[2] = el; }} className="h-[100px] shrink-0 border-b border-white/10">
                <Weather zip={settings.location.zip} />
              </div>
              <div ref={el => { sectionRefs.current[3] = el; }} className="flex-1 overflow-hidden border-b border-white/10">
                <Predictions />
              </div>
              <div ref={el => { sectionRefs.current[4] = el; }} className="flex-1 overflow-hidden">
                <Financial />
              </div>
            </div>
          </div>
        ) : (
          // Compact: Headlines dominant, info bar at bottom
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main content area - 3 columns */}
            <div className="flex-1 flex overflow-hidden">
              {/* Headlines - 50% */}
              <div
                ref={el => {
                  sectionRefs.current[0] = el;
                  headlinesRef.current = el;
                }}
                className="flex-1 overflow-hidden border-r border-white/10"
              >
                <Headlines
                  selectedIndex={selectedIndex}
                  onSelectIndex={setSelectedIndex}
                  onMarkAsRead={markAsRead}
                  readArticles={settings.readArticles}
                  savedArticles={settings.readingList}
                  filter={activeFilter}
                />
              </div>

              {/* Reddit - 25% */}
              <div
                ref={el => { sectionRefs.current[1] = el; }}
                className="w-1/4 overflow-hidden border-r border-white/10"
              >
                <Reddit
                  onSelectPost={(post) => {
                    if (post.permalink) {
                      window.open(post.permalink, '_blank', 'noopener,noreferrer');
                      markAsRead(post.id);
                    }
                  }}
                  maxItems={50}
                />
              </div>

              {/* Hacker News - 25% */}
              <div className="w-1/4 overflow-hidden">
                <HackerNews
                  onSelectStory={(story) => {
                    const url = story.url || story.permalink;
                    if (url) {
                      window.open(url, '_blank', 'noopener,noreferrer');
                      markAsRead(story.id);
                    }
                  }}
                  maxItems={50}
                />
              </div>
            </div>

            {/* Bottom info bar - Weather + Predictions + Financial */}
            <div className="h-24 shrink-0 border-t border-white/10 flex">
              <div
                ref={el => { sectionRefs.current[2] = el; }}
                className="w-1/3 border-r border-white/10"
              >
                <Weather zip={settings.location.zip} />
              </div>
              <div
                ref={el => { sectionRefs.current[3] = el; }}
                className="w-1/3 border-r border-white/10"
              >
                <Predictions />
              </div>
              <div ref={el => { sectionRefs.current[4] = el; }} className="w-1/3">
                <Financial />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ticker */}
      <div className="h-6 overflow-hidden relative shrink-0 border-t border-white/10">
        <Ticker />
      </div>

      {/* Modals */}
      {showKeyboardHelp && (
        <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />
      )}

      {showSearch && (
        <SearchBar
          headlines={allHeadlines}
          onSelect={handleSelectFromSearch}
          onClose={() => setShowSearch(false)}
          isOpen={showSearch}
        />
      )}

      {showSettings && (
        <Settings
          settings={settings}
          onClose={() => setShowSettings(false)}
          onToggleSource={toggleSource}
          onUpdateLocation={updateLocation}
          onAddCustomFeed={addCustomFeed}
          onRemoveCustomFeed={removeCustomFeed}
          onSetLayout={setLayout}
        />
      )}
    </div>
  );
}

export default App;
