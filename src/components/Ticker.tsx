import { useState, useEffect } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface TickerItem {
  id: string;
  text: string;
  source: string;
  category?: 'breaking' | 'markets' | 'trending' | 'general';
}

function getCategoryStyle(category?: TickerItem['category']): string {
  switch (category) {
    case 'breaking':
      return 'text-red-400 font-semibold';
    case 'markets':
      return 'text-green-400';
    case 'trending':
      return 'text-purple-400';
    default:
      return 'text-white/90';
  }
}

function getCategoryLabel(category?: TickerItem['category']): string | null {
  switch (category) {
    case 'breaking':
      return 'BREAKING';
    case 'markets':
      return 'MARKETS';
    case 'trending':
      return 'TRENDING';
    default:
      return null;
  }
}

export function Ticker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  // Fetch ticker items
  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch(`${API_BASE}/api/ticker`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error('Ticker fetch error:', err);
      }
    }

    fetchTicker();
    const interval = setInterval(fetchTicker, REFRESH_INTERVALS.ticker);
    return () => clearInterval(interval);
  }, []);

  // Duplicate items for seamless loop
  const duplicatedItems = [...items, ...items];

  if (items.length === 0) {
    return (
      <div className="h-full bg-gradient-to-r from-[#0d0d0d] via-[#111111] to-[#0d0d0d] flex items-center border-t border-white/10">
        <span className="text-white/40 text-sm px-4">Loading headlines...</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-r from-[#0d0d0d] via-[#111111] to-[#0d0d0d] flex items-center overflow-hidden border-t border-white/10">
      {/* Ticker content */}
      <div className="animate-ticker flex items-center whitespace-nowrap will-change-transform">
        {duplicatedItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex items-center">
            {/* Separator */}
            <span className="text-white/30 mx-3 text-xs">◆</span>

            {/* Category label */}
            {getCategoryLabel(item.category) && (
              <span className={`text-[10px] font-bold mr-1.5 ${getCategoryStyle(item.category)}`}>
                {getCategoryLabel(item.category)}:
              </span>
            )}

            {/* Item text */}
            <span className={`text-[11px] ${getCategoryStyle(item.category)}`}>
              {item.text}
            </span>

            {/* Source */}
            <span className="text-white/40 text-[10px] ml-1.5">
              — {item.source}
            </span>
          </div>
        ))}
      </div>

      {/* Right fade gradient */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
    </div>
  );
}
