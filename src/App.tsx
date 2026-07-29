import { useState, useCallback, useMemo } from 'react';
import {
  Weather,
  Financial,
  Predictions,
  Ticker,
  KeyboardHelp,
  SearchBar,
  Settings,
  ArticlePreview,
} from './components';
import type { FilterType } from './components';
import { Header } from './components/Header';
import { UnifiedFeed } from './components/UnifiedFeed';
import { Sidebar } from './components/Sidebar';
import { BottomTabBar } from './components/BottomTabBar';
import { useSettings, useKeyboard } from './hooks';
import { useUnifiedFeed } from './hooks/useUnifiedFeed';
import type { FeedItem, MobileView } from './types';
import './App.css';

function App() {
  const {
    settings,
    toggleSource,
    updateLocation,
    addToReadingList,
    removeFromReadingList,
    isInReadingList,
    markAsRead,
    toggleSection,
  } = useSettings();

  // UI State
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeView, setActiveView] = useState<MobileView>('feed');
  const [previewItem, setPreviewItem] = useState<FeedItem | null>(null);

  // Unified feed
  const enabledSources = useMemo(
    () => new Set(
      settings.sources
        .filter(source => source.enabled)
        .flatMap(source => source.apiSources || [source.name])
    ),
    [settings.sources]
  );
  const { items, briefingItems, loading, error, newItemIds, refresh } = useUnifiedFeed(enabledSources);

  // Filter items for search (flat list for search compatibility)
  const allHeadlines = items.map(item => ({
    id: item.id,
    title: item.title,
    source: item.source,
    timestamp: item.timestamp,
    link: item.link,
    type: item.sourceType,
  }));

  // Filtered items for keyboard nav count
  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'saved') return settings.readingList.includes(item.id);
    return item.sourceType === activeFilter;
  });

  const handleNavigateUp = useCallback(() => {
    if (showSearch || showSettings || showKeyboardHelp || previewItem) return;
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, [showSearch, showSettings, showKeyboardHelp, previewItem]);

  const handleNavigateDown = useCallback(() => {
    if (showSearch || showSettings || showKeyboardHelp || previewItem) return;
    setSelectedIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
  }, [showSearch, showSettings, showKeyboardHelp, previewItem, filteredItems.length]);

  const handlePreview = useCallback((article: FeedItem) => {
    setPreviewItem(article);
    markAsRead(article.id);
  }, [markAsRead]);

  const handleSelect = useCallback(() => {
    if (showSearch || showSettings || showKeyboardHelp || previewItem) return;
    const article = filteredItems[selectedIndex];
    if (article?.link) handlePreview(article);
  }, [showSearch, showSettings, showKeyboardHelp, previewItem, filteredItems, selectedIndex, handlePreview]);

  const handleSearch = useCallback(() => {
    if (showSettings || showKeyboardHelp) return;
    setShowSearch(true);
  }, [showSettings, showKeyboardHelp]);

  const handleEscape = useCallback(() => {
    if (previewItem) {
      setPreviewItem(null);
    } else if (showKeyboardHelp) {
      setShowKeyboardHelp(false);
    } else if (showSearch) {
      setShowSearch(false);
    } else if (showSettings) {
      setShowSettings(false);
    }
  }, [previewItem, showKeyboardHelp, showSearch, showSettings]);

  const handleHelp = useCallback(() => {
    setShowKeyboardHelp(prev => !prev);
  }, []);

  const handleSection = useCallback((section: number) => {
    // Sections map to views on mobile-like behavior
    if (section === 1) setActiveFilter('all');
    else if (section === 2) setActiveFilter('news');
    else if (section === 3) setActiveFilter('tech');
    else if (section === 4) setActiveFilter('social');
    else if (section === 5) setActiveFilter('saved');
  }, []);

  const handleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const handleSave = useCallback(() => {
    const article = filteredItems[selectedIndex];
    if (article) {
      if (isInReadingList(article.id)) {
        removeFromReadingList(article.id);
      } else {
        addToReadingList(article.id);
      }
    }
  }, [filteredItems, selectedIndex, isInReadingList, addToReadingList, removeFromReadingList]);

  const handleSelectFromSearch = useCallback((result: { id: string; link?: string }) => {
    const article = items.find(item => item.id === result.id);
    if (article) handlePreview(article);
    setShowSearch(false);
  }, [items, handlePreview]);

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

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col text-xs">
      {/* Header */}
      <Header
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        savedCount={settings.readingList.length}
        onSearchOpen={() => setShowSearch(true)}
        onHelpOpen={() => setShowKeyboardHelp(true)}
        onSettingsOpen={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Two-column layout (feed + sidebar) */}
        {/* Mobile: Single view controlled by bottom tabs */}

        {/* Feed — always visible on desktop, shown on mobile when activeView='feed' */}
        <div className={`flex-1 overflow-hidden ${activeView !== 'feed' ? 'hidden md:block' : ''}`}>
          <UnifiedFeed
            items={items}
            briefingItems={briefingItems}
            loading={loading}
            error={error}
            filter={activeFilter}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            readArticles={settings.readArticles}
            savedArticles={settings.readingList}
            newItemIds={newItemIds}
            onRefresh={refresh}
            onPreview={handlePreview}
          />
        </div>

        {/* Desktop sidebar */}
        <Sidebar
          zip={settings.location.zip}
          collapsedSections={settings.collapsedSections}
          onToggleSection={toggleSection}
        />

        {/* Mobile: Markets view */}
        {activeView === 'markets' && (
          <div className="flex-1 overflow-y-auto md:hidden feed-scroll">
            <div className="p-3">
              <h2 className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">Markets & Crypto</h2>
            </div>
            <Financial />
            <div className="border-t border-white/10 mt-2">
              <div className="p-3">
                <h2 className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">Predictions</h2>
              </div>
              <Predictions />
            </div>
          </div>
        )}

        {/* Mobile: Weather view */}
        {activeView === 'weather' && (
          <div className="flex-1 overflow-y-auto md:hidden feed-scroll">
            <div className="h-[250px]">
              <Weather zip={settings.location.zip} />
            </div>
          </div>
        )}

        {/* Mobile: More view */}
        {activeView === 'more' && (
          <div className="flex-1 overflow-y-auto md:hidden feed-scroll p-4">
            <div className="space-y-3">
              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 active:bg-white/10 text-left"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="text-white/90 text-sm font-medium">Settings</div>
                  <div className="text-white/50 text-xs">Sources, location, display</div>
                </div>
              </button>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 active:bg-white/10 text-left"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-white/90 text-sm font-medium">Keyboard Shortcuts</div>
                  <div className="text-white/50 text-xs">j/k, Enter, /, Esc</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Ticker — desktop only */}
      <div className="hidden md:block h-6 overflow-hidden relative shrink-0 border-t border-white/10">
        <Ticker />
      </div>

      {/* Bottom Tab Bar — mobile only */}
      <BottomTabBar activeView={activeView} onChangeView={setActiveView} />

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
        />
      )}

      <ArticlePreview
        item={previewItem}
        alternatives={briefingItems}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

export default App;
