import { useState, useEffect } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface RedditPost {
  id: string;
  title: string;
  source: string;
  subreddit: string;
  score: number;
  comments: number;
  url: string;
  permalink: string;
  timestamp: string;
  isExternal: boolean;
  thumbnail: string | null;
}

function formatScore(score: number): string {
  if (score >= 10000) return (score / 1000).toFixed(0) + 'k';
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

function getSubredditColor(subreddit: string): string {
  const colors: Record<string, string> = {
    news: 'text-blue-400',
    worldnews: 'text-green-400',
    technology: 'text-purple-400',
  };
  return colors[subreddit] || 'text-orange-400';
}

interface RedditProps {
  onSelectPost?: (post: RedditPost) => void;
  selectedId?: string;
  maxItems?: number;
}

export function Reddit({ onSelectPost, selectedId, maxItems = 10 }: RedditProps) {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch(`${API_BASE}/api/reddit`);
        if (!res.ok) throw new Error('Failed to fetch');
        setPosts(await res.json());
        setError(null);
      } catch (err) {
        console.error('Reddit fetch error:', err);
        setError('Unable to load Reddit');
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
    const interval = setInterval(fetchPosts, REFRESH_INTERVALS.reddit);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-2 py-1 border-b border-white/10 flex items-center gap-1.5">
          <span className="text-orange-500 text-xs font-bold">r/</span>
          <span className="text-white/60 text-xs font-medium">Reddit</span>
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
        <span className="text-orange-500 text-xs font-bold">r/</span>
        <span className="text-white/60 text-xs font-medium">Reddit</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="px-2 py-2 text-white/40 text-xs">{error}</div>
        ) : (
          <div className="divide-y divide-white/5">
            {posts.slice(0, maxItems).map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectPost?.(post);
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer transition-colors text-xs leading-tight ${
                  selectedId === post.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {/* Score */}
                <span className="text-orange-400 shrink-0 w-7 text-right tabular-nums font-medium">
                  {formatScore(post.score)}
                </span>

                {/* Subreddit */}
                <span className={`shrink-0 w-10 truncate ${getSubredditColor(post.subreddit)}`}>
                  {post.subreddit}
                </span>

                {/* Title */}
                <span className="flex-1 text-white/90 line-clamp-1">{post.title}</span>

                {/* Comments & Time */}
                <span className="text-white/40 shrink-0 tabular-nums">
                  {post.comments}c
                </span>
                <span className="text-white/40 shrink-0 w-5 text-right tabular-nums">
                  {formatTimeAgo(post.timestamp)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
