import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import type { FeedItem as FeedItemType } from '../types';
import { formatTimeAgo, formatScore, getSourceColor, getCategoryDotColor } from '../utils/formatters';

interface FeedItemProps {
  item: FeedItemType;
  isSelected?: boolean;
  isRead?: boolean;
  isSaved?: boolean;
  isNew?: boolean;
  onSelect?: (item: FeedItemType) => void;
  onMarkAsRead?: (id: string) => void;
}

export function FeedItem({
  item,
  isSelected = false,
  isRead = false,
  isSaved = false,
  isNew = false,
  onSelect,
  onMarkAsRead,
}: FeedItemProps) {
  const handleClick = useCallback((e: MouseEvent) => {
    if (!e.ctrlKey && !e.metaKey && e.button === 0) {
      e.preventDefault();
      if (item.link) {
        window.open(item.link, '_blank', 'noopener,noreferrer');
        onMarkAsRead?.(item.id);
      }
    }
    onSelect?.(item);
  }, [item, onSelect, onMarkAsRead]);

  const handleAuxClick = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      onMarkAsRead?.(item.id);
    }
  }, [item.id, onMarkAsRead]);

  return (
    <a
      href={item.link || '#'}
      data-headline
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      className={`
        block cursor-pointer transition-colors border-b border-white/5
        ${isSelected ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'}
        ${isRead ? 'opacity-50' : ''}
        ${isNew ? 'new-item-glow headline-enter' : ''}
      `}
    >
      {/* Desktop: single dense line */}
      <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 text-xs leading-tight">
        {/* Category dot */}
        <span className={`w-1 h-1 rounded-full shrink-0 ${getCategoryDotColor(item.sourceType)}`} />

        {/* Source badge */}
        <span className={`shrink-0 text-[10px] px-1 py-px rounded ${getSourceColor(item.source)} text-white/90 font-medium`}>
          {item.source.length > 12 ? item.source.slice(0, 10) + '..' : item.source}
        </span>

        {/* Score (Reddit/HN) */}
        {item.score != null && (
          <span className="text-orange-400 shrink-0 w-7 text-right tabular-nums font-medium">
            {formatScore(item.score)}
          </span>
        )}

        {/* Title */}
        <span className={`flex-1 line-clamp-1 ${isRead ? 'text-white/40' : 'text-white/90'}`}>
          {item.title}
        </span>

        {/* Comments (Reddit/HN) */}
        {item.comments != null && (
          <span className="text-white/40 shrink-0 tabular-nums text-[10px]">
            {item.comments}c
          </span>
        )}

        {/* Saved indicator */}
        {isSaved && <span className="text-yellow-400 shrink-0">★</span>}

        {/* Time */}
        <span className="text-white/40 shrink-0 w-6 text-right tabular-nums">
          {formatTimeAgo(item.timestamp)}
        </span>
      </div>

      {/* Mobile: two-line layout with larger touch target */}
      <div className="flex md:hidden flex-col gap-0.5 px-3 py-3 min-h-[44px]">
        {/* Title */}
        <span className={`text-sm leading-snug line-clamp-2 ${isRead ? 'text-white/40' : 'text-white/90'}`}>
          {item.title}
        </span>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px]">
          {/* Category dot */}
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getCategoryDotColor(item.sourceType)}`} />

          {/* Source badge */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getSourceColor(item.source)} text-white/90`}>
            {item.source}
          </span>

          {/* Score */}
          {item.score != null && (
            <span className="text-orange-400 tabular-nums font-medium">
              {formatScore(item.score)}
            </span>
          )}

          {/* Comments */}
          {item.comments != null && (
            <span className="text-white/40 tabular-nums">
              {item.comments}c
            </span>
          )}

          <span className="flex-1" />

          {/* Saved */}
          {isSaved && <span className="text-yellow-400">★</span>}

          {/* Time */}
          <span className="text-white/40 tabular-nums">
            {formatTimeAgo(item.timestamp)}
          </span>
        </div>
      </div>
    </a>
  );
}
