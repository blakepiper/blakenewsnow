import { useState, useEffect } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface HNStory {
  id: string;
  title: string;
  source: string;
  score: number;
  comments: number;
  url: string;
  permalink: string;
  timestamp: string;
  by: string;
  type: string;
}

function formatScore(score: number): string {
  if (score >= 1000) return (score / 1000).toFixed(1) + 'k';
  return score.toString();
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
  return `${Math.floor(diffHours / 24)}d`;
}

function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '').slice(0, 15);
  } catch {
    return '';
  }
}

interface HackerNewsProps {
  onSelectStory?: (story: HNStory) => void;
  selectedId?: string;
  maxItems?: number;
}

export function HackerNews({ onSelectStory, selectedId, maxItems = 15 }: HackerNewsProps) {
  const [stories, setStories] = useState<HNStory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch(`${API_BASE}/api/hackernews`);
        if (!res.ok) throw new Error('Failed to fetch');
        setStories(await res.json());
        setError(null);
      } catch (err) {
        console.error('HN fetch error:', err);
        setError('Unable to load HN');
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
    const interval = setInterval(fetchStories, REFRESH_INTERVALS.hackernews);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-2 py-1 border-b border-white/10 flex items-center gap-1.5">
          <span className="text-orange-400 text-xs font-bold">Y</span>
          <span className="text-white/60 text-xs font-medium">Hacker News</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="px-2 py-0.5">
              <div className="skeleton h-3.5 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 py-1 border-b border-white/10 flex items-center gap-1.5">
        <span className="text-orange-400 text-xs font-bold">Y</span>
        <span className="text-white/60 text-xs font-medium">Hacker News</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="px-2 py-2 text-white/40 text-xs">{error}</div>
        ) : (
          <div className="divide-y divide-white/5">
            {stories.slice(0, maxItems).map((story) => (
              <a
                key={story.id}
                href={story.url || story.permalink}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectStory?.(story);
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer transition-colors text-xs leading-tight ${
                  selectedId === story.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {/* Score */}
                <span className="text-orange-400 shrink-0 w-6 text-right tabular-nums font-medium">
                  {formatScore(story.score)}
                </span>

                {/* Title */}
                <span className="flex-1 text-white/90 line-clamp-1">{story.title}</span>

                {/* Domain */}
                {story.url && (
                  <span className="text-white/30 shrink-0 truncate max-w-20">
                    {getDomain(story.url)}
                  </span>
                )}

                {/* Comments & Time */}
                <span className="text-white/40 shrink-0 tabular-nums">
                  {story.comments}c
                </span>
                <span className="text-white/40 shrink-0 w-5 text-right tabular-nums">
                  {formatTimeAgo(story.timestamp)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
