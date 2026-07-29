import { useState, useRef, useEffect, useCallback } from 'react';
import { formatTimeAgo, getSourceColor } from '../utils/formatters';

interface SearchResult {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  link?: string;
  type?: 'news' | 'social' | 'tech' | 'science';
}

interface SearchBarProps {
  headlines: SearchResult[];
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
  isOpen: boolean;
}

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Simple contains match
  if (lowerText.includes(lowerQuery)) return true;

  // Fuzzy match - all query chars in order
  let qi = 0;
  for (let i = 0; i < lowerText.length && qi < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[qi]) qi++;
  }
  return qi === lowerQuery.length;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-yellow-500/30 text-yellow-200">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchBar({ headlines, onSelect, onClose, isOpen }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = query.length >= 2
    ? headlines.filter(h => fuzzyMatch(query, h.title)).slice(0, 20)
    : [];

  // Group results by source
  const groupedResults = results.reduce((acc, result) => {
    const key = result.source;
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Flatten for keyboard navigation
  const flatResults = Object.values(groupedResults).flat();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current && flatResults.length > 0) {
      const items = listRef.current.querySelectorAll('[data-result]');
      const selectedItem = items[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatResults.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          onSelect(flatResults[selectedIndex]);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatResults, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-0 md:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-2xl bg-[#1a1a1a] md:border md:border-white/10 md:rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 md:py-3 border-b border-white/10 pt-[max(1rem,var(--sat))]">
          <svg className="w-5 h-5 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search headlines..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-white/30"
          />
          <kbd className="text-white/50 text-xs px-1.5 py-0.5 border border-white/20 rounded">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 md:max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-6 text-center text-white/40 text-sm">
              Type at least 2 characters to search
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/40 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(groupedResults).map(([source, items]) => (
              <div key={source}>
                <div className="px-4 py-1.5 text-white/40 text-xs font-medium uppercase tracking-wide bg-white/5">
                  {source}
                </div>
                {items.map((result) => {
                  const idx = flatResults.indexOf(result);
                  return (
                    <div
                      key={result.id}
                      data-result
                      onClick={() => {
                        onSelect(result);
                        onClose();
                      }}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        idx === selectedIndex ? 'bg-blue-500/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${getSourceColor(result.source)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 text-sm leading-snug line-clamp-2">
                            {highlightMatch(result.title, query)}
                          </div>
                          <div className="text-white/40 text-xs mt-0.5">
                            {formatTimeAgo(result.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-white/50 text-xs">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1 border border-white/20 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 border border-white/20 rounded">Enter</kbd> Open</span>
          </div>
          <span>{flatResults.length} results</span>
        </div>
      </div>
    </div>
  );
}
