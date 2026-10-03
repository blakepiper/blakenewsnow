import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';
import { getSourceCategory } from '../utils/formatters';
import { groupFeedItems, isCurrentFeedItem, isBriefingReport } from '../utils/feedGrouping';
import type { FeedItem } from '../types';

import { pollingQuery } from '../utils/polling';
interface CustomFeedDefinition { name: string; url: string }
interface RawItem extends Partial<FeedItem> {
  id: string; title: string; source: string; timestamp: string;
  url?: string; permalink?: string; replies?: number;
}
function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

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
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let initialComplete = false;
    let batch: ReturnType<typeof setTimeout> | undefined;
    const sourceParams = new URLSearchParams({ sources: [...enabledSources].sort().join(',') });
    const paths = ['headlines', 'tech', 'science', 'local', 'finance', 'custom', 'lemmy', 'open-social', 'hackernews', '4chan'];
    const queries = paths.map(path => pollingQuery<RawItem[]>(`${API_BASE}/api/${path}?${path === 'custom'
      ? new URLSearchParams({ feeds: JSON.stringify(customFeeds) }) : sourceParams}`, REFRESH_INTERVALS.headlines));
    const publish = () => {
      if (!active) return;
      const feedItems = queries.flatMap((query, index) => {
        const path = paths[index];
        const data = query.getSnapshot().data;
        if (!Array.isArray(data)) return [];
        return data.map((raw): FeedItem => ({
          ...raw, category: raw.source,
          sourceType: path === 'headlines' || path === '4chan' ? getSourceCategory(raw.source)
            : path === 'hackernews' || path === 'tech' ? 'tech'
            : path === 'science' ? 'science' : path === 'finance' ? 'finance'
            : path === 'local' ? 'local' : path === 'custom' ? 'news' : 'social',
          link: raw.link || raw.url || raw.permalink || '',
          ...(path === 'hackernews' ? { domain: getDomain(raw.url || '') } : {}),
          ...(path === '4chan' ? { score: raw.replies, comments: raw.replies } : {}),
        }));
      });
      const now = Date.now();
      const validItems = feedItems.filter(item => enabledSources.has(item.source) && isCurrentFeedItem(item, now))
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      const deduped = groupFeedItems(validItems);
      const currentIds = new Set(deduped.map(item => item.id));
      if (initialComplete && prevItemIdsRef.current.size) {
        const newIds = new Set([...currentIds].filter(id => !prevItemIdsRef.current.has(id)));
        if (newIds.size) {
          setNewItemIds(previous => new Set([...previous, ...newIds]));
          if (newItemsTimerRef.current) clearTimeout(newItemsTimerRef.current);
          newItemsTimerRef.current = window.setTimeout(() => { setNewItemIds(new Set()); }, 3000);
        }
      }
      prevItemIdsRef.current = currentIds;
      setBriefingItems(validItems.filter(isBriefingReport));
      setItems(deduped);
      const states = queries.map(query => query.getSnapshot());
      initialComplete = states.every(state => !state.loading);
      setLoading(!deduped.length && states.some(state => state.loading));
      setError(!deduped.length && states.every(state => state.error) ? 'Unable to load feed' : null);
    };
    const onUpdate = () => {
      clearTimeout(batch);
      batch = setTimeout(publish, 40);
    };
    const unsubscribes = queries.map(query => query.subscribe(onUpdate));
    publish();
    refreshRef.current = () => { for (const query of queries) void query.refresh(); };
    return () => {
      active = false;
      clearTimeout(batch);
      unsubscribes.forEach(unsubscribe => unsubscribe());
      if (newItemsTimerRef.current) clearTimeout(newItemsTimerRef.current);
    };
  }, [customFeeds, enabledSources]);
  const refresh = useCallback(() => { refreshRef.current(); }, []);
  return { items, briefingItems, loading, error, newItemIds, refresh };
}
