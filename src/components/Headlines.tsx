import { useState, useEffect, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';
import type { FilterType } from './FilterPills';

interface Headline {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  link?: string;
  category?: 'news' | 'tech' | 'social';
  score?: number;
  comments?: number;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'NPR': 'bg-blue-500',
    'BBC': 'bg-amber-500',
    'Guardian': 'bg-indigo-500',
    'Al Jazeera': 'bg-orange-500',
    'ABC News': 'bg-yellow-500',
    'CBS News': 'bg-cyan-500',
    'NY Times': 'bg-slate-400',
    'Google Trends': 'bg-green-500',
    'Reuters': 'bg-orange-600',
    'Associated Press': 'bg-red-500',
    'Hacker News': 'bg-orange-400',
    'Ars Technica': 'bg-orange-500',
    'The Verge': 'bg-purple-500',
    'TechCrunch': 'bg-green-500',
    'Wired': 'bg-gray-600',
    'Lobsters': 'bg-red-600',
  };
  if (source.startsWith('r/')) return 'bg-orange-600';
  return colors[source] || 'bg-gray-500';
}

function getSourceCategory(source: string): 'news' | 'tech' | 'social' {
  const techSources = ['Hacker News', 'Ars Technica', 'The Verge', 'TechCrunch', 'Wired', 'Lobsters'];
  if (techSources.includes(source)) return 'tech';
  if (source.startsWith('r/')) return 'social';
  return 'news';
}

function HeadlineSkeleton() {
  return (
    <div className="px-2 py-0.5">
      <div className="skeleton h-3.5 w-full rounded" />
    </div>
  );
}

interface HeadlinesProps {
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  onMarkAsRead?: (id: string) => void;
  readArticles?: string[];
  savedArticles?: string[];
  filter?: FilterType;
}

export function Headlines({
  selectedIndex,
  onSelectIndex,
  onMarkAsRead,
  readArticles = [],
  savedArticles = [],
  filter = 'all',
}: HeadlinesProps) {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHeadlines() {
      try {
        const res = await fetch(`${API_BASE}/api/headlines`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setHeadlines(data);
        setError(null);
      } catch (err) {
        console.error('Headlines fetch error:', err);
        setError('Unable to load headlines');
      } finally {
        setLoading(false);
      }
    }

    fetchHeadlines();
    const interval = setInterval(fetchHeadlines, REFRESH_INTERVALS.headlines);
    return () => clearInterval(interval);
  }, []);

  // Filter headlines based on active filter
  const filteredHeadlines = headlines.filter(headline => {
    if (filter === 'all') return true;
    if (filter === 'saved') return savedArticles.includes(headline.id);
    const category = getSourceCategory(headline.source);
    return category === filter;
  });

  // Open article in new tab
  const openArticle = useCallback((headline: Headline) => {
    if (headline.link) {
      window.open(headline.link, '_blank', 'noopener,noreferrer');
      onMarkAsRead?.(headline.id);
    }
  }, [onMarkAsRead]);

  // Handle click - open article directly
  const handleClick = useCallback((e: MouseEvent, headline: Headline, index: number) => {
    if (!e.ctrlKey && !e.metaKey && e.button === 0) {
      e.preventDefault();
      openArticle(headline);
    }
    onSelectIndex?.(index);
  }, [openArticle, onSelectIndex]);

  // Handle middle click
  const handleAuxClick = useCallback((e: MouseEvent, headline: Headline) => {
    if (e.button === 1) {
      onMarkAsRead?.(headline.id);
    }
  }, [onMarkAsRead]);

  if (loading) {
    return (
      <div className="h-full overflow-hidden">
        <div className="divide-y divide-white/5">
          {[...Array(20)].map((_, i) => (
            <HeadlineSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {error ? (
        <div className="px-2 py-2 text-white/60 text-xs">{error}</div>
      ) : filteredHeadlines.length === 0 ? (
        <div className="px-2 py-4 text-center text-white/50 text-xs">
          {filter === 'saved' ? 'No saved articles.' : 'No headlines.'}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {filteredHeadlines.map((headline, index) => {
            const isRead = readArticles.includes(headline.id);
            const isSaved = savedArticles.includes(headline.id);

            return (
              <a
                key={headline.id}
                href={headline.link || '#'}
                data-headline
                onClick={(e) => handleClick(e, headline, index)}
                onAuxClick={(e) => handleAuxClick(e, headline)}
                className={`flex items-start gap-1.5 px-2 py-0.5 cursor-pointer transition-colors text-xs leading-tight ${
                  selectedIndex === index
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                } ${isRead ? 'opacity-50' : ''}`}
              >
                {/* Source indicator */}
                <span className={`w-1 h-1 rounded-full mt-1 shrink-0 ${getSourceColor(headline.source)}`} />

                {/* Source name */}
                <span className={`shrink-0 w-14 truncate ${isRead ? 'text-white/30' : 'text-white/50'}`}>
                  {headline.source}
                </span>

                {/* Title */}
                <span className={`flex-1 line-clamp-1 ${isRead ? 'text-white/40' : 'text-white/90'}`}>
                  {headline.title}
                </span>

                {/* Saved indicator */}
                {isSaved && <span className="text-yellow-400 shrink-0">★</span>}

                {/* Time */}
                <span className="text-white/40 shrink-0 w-6 text-right tabular-nums">
                  {formatTimeAgo(headline.timestamp)}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
