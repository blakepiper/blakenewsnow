import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';
import { getSourceCategory } from '../utils/formatters';
import type { FeedItem } from '../types';

interface RawHeadline {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  link?: string;
  description?: string;
}

interface CustomFeedDefinition {
  name: string;
  url: string;
}

interface RawSocialPost {
  id: string;
  title: string;
  source: string;
  community: string;
  score?: number;
  comments?: number;
  url: string;
  permalink: string;
  timestamp: string;
  description?: string;
}

interface RawHNStory {
  id: string;
  title: string;
  source: string;
  score: number;
  comments: number;
  url: string;
  permalink: string;
  timestamp: string;
}

interface Raw4chanThread {
  id: string;
  title: string;
  board: string;
  source: string;
  replies: number;
  images: number;
  url: string;
  timestamp: string;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function titlesMatch(a: string, b: string): boolean {
  const wordsA = new Set(normalizeTitle(a).split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(normalizeTitle(b).split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  const smaller = Math.min(wordsA.size, wordsB.size);
  return smaller > 0 && shared / smaller > 0.7;
}

function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

const MAX_FEED_ITEM_AGE = 7 * 24 * 60 * 60 * 1000;

export function useUnifiedFeed(
  enabledSources: ReadonlySet<string>,
  customFeeds: readonly CustomFeedDefinition[] = []
) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [briefingItems, setBriefingItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const prevItemIdsRef = useRef<Set<string>>(new Set());
  const newItemsTimerRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    try {
      const sourceParams = new URLSearchParams({
        sources: [...enabledSources].sort().join(','),
      });
      const customParams = new URLSearchParams({
        feeds: JSON.stringify(customFeeds),
      });
      const [headlinesRes, techRes, scienceRes, localRes, customRes, lemmyRes, openSocialRes, hnRes, chanRes] = await Promise.all([
        fetch(`${API_BASE}/api/headlines?${sourceParams}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/tech`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/science?${sourceParams}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/local?${sourceParams}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/custom?${customParams}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/lemmy`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/open-social`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/hackernews`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${API_BASE}/api/4chan`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      const feedItems: FeedItem[] = [];

      // Normalize headlines
      (headlinesRes as RawHeadline[]).forEach((h) => {
        feedItems.push({
          id: h.id,
          title: h.title,
          source: h.source,
          sourceType: getSourceCategory(h.source),
          category: h.source,
          timestamp: h.timestamp,
          link: h.link || '',
          description: h.description,
        });
      });

      // Normalize tech news
      (techRes as RawHeadline[]).forEach((h) => {
        feedItems.push({
          id: h.id,
          title: h.title,
          source: h.source,
          sourceType: 'tech',
          category: h.source,
          timestamp: h.timestamp,
          link: h.link || '',
          description: h.description,
        });
      });

      // Normalize science reporting and journal articles
      (scienceRes as RawHeadline[]).forEach((h) => {
        feedItems.push({
          id: h.id,
          title: h.title,
          source: h.source,
          sourceType: 'science',
          category: h.source,
          timestamp: h.timestamp,
          link: h.link || '',
          description: h.description,
        });
      });

      // Normalize DC and Alexandria local news
      (localRes as RawHeadline[]).forEach((h) => {
        feedItems.push({
          id: h.id,
          title: h.title,
          source: h.source,
          sourceType: 'local',
          category: h.source,
          timestamp: h.timestamp,
          link: h.link || '',
          description: h.description,
        });
      });

      // Normalize user-provided public RSS/Atom feeds
      (customRes as RawHeadline[]).forEach((h) => {
        feedItems.push({
          id: h.id,
          title: h.title,
          source: h.source,
          sourceType: 'news',
          category: h.source,
          timestamp: h.timestamp,
          link: h.link || '',
          description: h.description,
        });
      });

      // Normalize federated social news
      (lemmyRes as RawSocialPost[]).forEach((post) => {
        feedItems.push({
          id: post.id,
          title: post.title,
          source: post.source,
          sourceType: 'social',
          category: post.source,
          timestamp: post.timestamp,
          link: post.url || post.permalink,
          score: post.score,
          comments: post.comments,
          community: post.community,
          description: post.description,
        });
      });

      // Normalize credential-free Bluesky and Mastodon signals
      (openSocialRes as RawSocialPost[]).forEach((post) => {
        feedItems.push({
          id: post.id,
          title: post.title,
          source: post.source,
          sourceType: 'social',
          category: post.source,
          timestamp: post.timestamp,
          link: post.url || post.permalink,
          score: post.score,
          comments: post.comments,
          community: post.community,
          description: post.description,
        });
      });

      // Normalize HN
      (hnRes as RawHNStory[]).forEach((h) => {
        feedItems.push({
          id: h.id,
          title: h.title,
          source: 'Hacker News',
          sourceType: 'tech',
          category: 'Hacker News',
          timestamp: h.timestamp,
          link: h.url || h.permalink,
          score: h.score,
          comments: h.comments,
          domain: getDomain(h.url),
        });
      });

      // Normalize 4chan
      (chanRes as Raw4chanThread[]).forEach((t) => {
        feedItems.push({
          id: t.id,
          title: t.title,
          source: t.source,
          sourceType: 'social',
          category: t.source,
          timestamp: t.timestamp,
          link: t.url,
          score: t.replies,
          comments: t.replies,
        });
      });

      // Treat the client as a second line of defense against invalid upstream data.
      const now = Date.now();
      const validItems = feedItems.filter(item => {
        const timestamp = new Date(item.timestamp).getTime();
        return enabledSources.has(item.source)
          && item.link
          && Number.isFinite(timestamp)
          && timestamp <= now + 15 * 60 * 1000
          && timestamp >= now - MAX_FEED_ITEM_AGE;
      });

      validItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Deduplicate across sources
      const deduped: FeedItem[] = [];
      for (const item of validItems) {
        const isDuplicate = item.sourceType !== 'local'
          && deduped.some(existing => existing.sourceType !== 'local' && titlesMatch(existing.title, item.title));
        if (!isDuplicate) {
          deduped.push(item);
        }
      }

      if (requestSequence !== requestSequenceRef.current) return;

      // Track new items
      const currentIds = new Set(deduped.map(i => i.id));
      if (prevItemIdsRef.current.size > 0) {
        const newIds = new Set<string>();
        for (const id of currentIds) {
          if (!prevItemIdsRef.current.has(id)) {
            newIds.add(id);
          }
        }
        if (newIds.size > 0) {
          setNewItemIds(newIds);
          if (newItemsTimerRef.current) clearTimeout(newItemsTimerRef.current);
          newItemsTimerRef.current = window.setTimeout(() => {
            setNewItemIds(new Set());
            newItemsTimerRef.current = null;
          }, 3000);
        }
      }
      prevItemIdsRef.current = currentIds;

      // Preserve corroborating reports for event clustering even when the visible feed
      // collapses near-identical headlines from different publishers.
      setBriefingItems(validItems);
      setItems(deduped);
      setError(null);
    } catch (err) {
      console.error('Unified feed fetch error:', err);
      if (requestSequence === requestSequenceRef.current) {
        setError('Unable to load feed');
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [customFeeds, enabledSources]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVALS.headlines);
    return () => {
      clearInterval(interval);
      if (newItemsTimerRef.current) clearTimeout(newItemsTimerRef.current);
    };
  }, [fetchAll]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAll();
  }, [fetchAll]);

  return { items, briefingItems, loading, error, newItemIds, refresh };
}
