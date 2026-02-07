import { useRef, useCallback, useState } from 'react';
import type { FeedItem as FeedItemType } from '../types';
import type { FilterType } from './FilterPills';
import { FeedItem } from './FeedItem';

interface UnifiedFeedProps {
  items: FeedItemType[];
  loading: boolean;
  error: string | null;
  filter: FilterType;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onMarkAsRead: (id: string) => void;
  readArticles: string[];
  savedArticles: string[];
  newItemIds: Set<string>;
  onRefresh: () => void;
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
  loading,
  error,
  filter,
  selectedIndex,
  onSelectIndex,
  onMarkAsRead,
  readArticles,
  savedArticles,
  newItemIds,
  onRefresh,
}: UnifiedFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);

  // Filter items
  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'saved') return savedArticles.includes(item.id);
    return item.sourceType === filter;
  });

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
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

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto feed-scroll"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator (mobile) */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center text-white/50 text-xs md:hidden"
          style={{ height: pullDistance }}
        >
          {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      {error ? (
        <div className="px-3 py-4 text-center text-white/60 text-sm">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="px-3 py-8 text-center text-white/50 text-sm">
          {filter === 'saved' ? 'No saved articles.' : 'No items to show.'}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {filteredItems.map((item, index) => (
            <FeedItem
              key={item.id}
              item={item}
              isSelected={selectedIndex === index}
              isRead={readArticles.includes(item.id)}
              isSaved={savedArticles.includes(item.id)}
              isNew={newItemIds.has(item.id)}
              onSelect={() => onSelectIndex(index)}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
