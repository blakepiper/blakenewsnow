import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { FeedItem as FeedItemType } from '../types';
import type { FilterType } from './FilterPills';
import { FeedItem } from './FeedItem';
import { NowBriefing } from './NowBriefing';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface UnifiedFeedProps {
  items: FeedItemType[];
  briefingItems: FeedItemType[];
  loading: boolean;
  error: string | null;
  filter: FilterType;
  emptyMessage?: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  readArticles: string[];
  newItemIds: Set<string>;
  onRefresh: () => void;
  onPreview: (item: FeedItemType) => void;
}

function FeedSkeleton() {
  return (
    <>
      {[...Array(20)].map((_, i) => (
        <div key={i} className="px-3 py-2 md:px-2 md:py-0.5">
          <div className="skeleton h-4 md:h-3.5 w-full rounded" />
        </div>
      ))}
    </>
  );
}

export function UnifiedFeed({
  items,
  briefingItems,
  loading,
  error,
  filter,
  emptyMessage = 'No items to show.',
  selectedIndex,
  onSelectIndex,
  readArticles,
  newItemIds,
  onRefresh,
  onPreview,
}: UnifiedFeedProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);

  // Filter items
  const filteredItems = useMemo(() => filter === 'all' ? items : items.filter(item => {
    return item.sourceType === filter;
  }), [items, filter]);
  const filteredBriefingItems = useMemo(() => filter === 'all' ? briefingItems : briefingItems.filter(item => {
    return item.sourceType === filter;
  }), [briefingItems, filter]);

  const readIds = useMemo(() => new Set(readArticles), [readArticles]);
  const selectItem = useCallback((item: FeedItemType, index: number) => {
    onSelectIndex(index); onPreview(item);
  }, [onSelectIndex, onPreview]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (isDesktop) {
      const container = desktopRef.current;
      if (!container) return;
      const els = container.querySelector(`[data-feed-index="${selectedIndex}"]`);
      els?.scrollIntoView({ block: 'nearest' });
    } else {
      const container = mobileRef.current;
      if (!container) return;
      const els = container.querySelector(`[data-feed-index="${selectedIndex}"]`);
      els?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isDesktop]);

  // Pull-to-refresh touch handlers (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (mobileRef.current && mobileRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, onRefresh]);

  if (loading && items.length === 0) {
    return (
      <div className="h-full overflow-hidden">
        <FeedSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="px-3 py-4 text-center text-white/60 text-sm">{error}</div>;
  }

  if (filteredItems.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-white/50 text-sm">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: single scrollable column
  if (!isDesktop) {
    return (
      <div
        ref={mobileRef}
        className="h-full overflow-y-auto feed-scroll"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center text-white/50 text-xs"
            style={{ height: pullDistance }}
          >
            {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        )}
        <NowBriefing items={filteredBriefingItems} onPreview={onPreview} />
        {filteredItems.map((item, index) => (
          <FeedItem
            key={item.id}
            item={item}
            isDesktop={isDesktop}
            isSelected={selectedIndex === index}
            isRead={readIds.has(item.id)}
            isNew={newItemIds.has(item.id)}
            index={index}
            onSelect={selectItem}
          />
        ))}
      </div>
    );
  }

  // Desktop: one row-major grid keeps rank order legible across both columns.
  return (
    <div
      ref={desktopRef}
      className="h-full grid grid-cols-2 content-start overflow-y-auto feed-scroll"
    >
      <NowBriefing items={filteredBriefingItems} onPreview={onPreview} />
      {filteredItems.map((item, index) => (
        <div key={item.id} className={index % 2 === 0 ? 'border-r border-white/5' : ''}>
          <FeedItem
            item={item}
            isDesktop={isDesktop}
            isSelected={selectedIndex === index}
            isRead={readIds.has(item.id)}
            isNew={newItemIds.has(item.id)}
            index={index}
            onSelect={selectItem}
          />
        </div>
      ))}
    </div>
  );
}
