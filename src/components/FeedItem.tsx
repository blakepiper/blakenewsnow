import { useCallback, memo } from 'react';
import type { FeedItem as FeedItemType } from '../types';
import { formatTimeAgo, formatScore } from '../utils/formatters';
import { SourceChip } from './SourceChip';
import { entryContentType } from '../../shared/source-policy.js';

interface FeedItemProps {
  item: FeedItemType;
  isDesktop: boolean;
  isSelected?: boolean;
  isRead?: boolean;
  isNew?: boolean;
  index?: number;
  onSelect?: (item: FeedItemType, index: number) => void;
}

export const FeedItem = memo(function FeedItem({
  item,
  isDesktop,
  isSelected = false,
  isRead = false,
  isNew = false,
  onSelect,
  index = 0,
}: FeedItemProps) {
  const contentType = item.contentType || entryContentType(item);
  const label = contentType === 'reporting' ? '' : contentType;
  const sources = item.sources || [item.source];
  const provenance = [...sources, ...(item.publisher && item.publisher !== item.source ? [item.publisher] : [])].join(', ');
  const timeLabel = item.timestampKind && item.timestampKind !== 'published' ? item.timestampKind : '';
  const handleClick = useCallback(() => {
    onSelect?.(item, index);
  }, [item, index, onSelect]);

  return (
    <button
      type="button"
      data-feed-index={index}
      data-headline
      title={`${provenance}${label ? ` · ${label}` : ''}\n${timeLabel || 'Published'}: ${item.timestamp}${item.publishedAt ? `\nArticle date (${item.publicationDateSource || 'publisher'}): ${item.publishedAt}` : ''}`}
      onClick={handleClick}
      className={`
        block w-full text-left cursor-pointer transition-colors border-b border-white/5
        ${isSelected ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'}
        ${isRead ? 'opacity-50' : ''}
        ${isNew ? 'new-item-glow headline-enter' : ''}
      `}
    >
      {/* Desktop: single dense line */}
      {isDesktop && <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 text-xs leading-tight">
        {/* Source badge */}
        <SourceChip source={item.source} className="shrink-0 text-[10px] px-1 py-px rounded font-medium">
          {item.source.length > 12 ? item.source.slice(0, 10) + '..' : item.source}
        </SourceChip>
        {sources.length > 1 && <span className="text-white/50 shrink-0">+{sources.length - 1}</span>}
        {label && <span className="text-white/40 text-[9px] shrink-0 max-w-24 truncate">{label}</span>}

        {/* Score (social/HN) */}
        {item.score != null && (
          <span className="text-orange-400 shrink-0 w-7 text-right tabular-nums font-medium">
            {formatScore(item.score)}
          </span>
        )}

        {/* Title */}
        <span className={`flex-1 line-clamp-1 ${isRead ? 'text-white/40' : 'text-white/90'}`}>
          {item.title}
        </span>

        {/* Comments (social/HN) */}
        {item.comments != null && (
          <span className="text-white/40 shrink-0 tabular-nums text-[10px]">
            {item.comments}c
          </span>
        )}

        {/* Time */}
        <span className="text-white/40 shrink-0 text-right tabular-nums">
          {timeLabel && `${timeLabel} `}{formatTimeAgo(item.timestamp)}
        </span>
      </div>}

      {/* Mobile: two-line layout with larger touch target */}
      {!isDesktop && <div className="flex md:hidden flex-col gap-0.5 px-3 py-3 min-h-[44px]">
        {/* Title */}
        <span className={`text-sm leading-snug line-clamp-2 ${isRead ? 'text-white/40' : 'text-white/90'}`}>
          {item.title}
        </span>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px]">
          {/* Source badge */}
          <SourceChip source={item.source} className="px-1.5 py-0.5 rounded text-[10px] font-medium">
            {item.source}
          </SourceChip>
          {sources.length > 1 && <span className="text-white/50">+{sources.length - 1}</span>}
          {label && <span className="text-white/40">{label}</span>}

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

          {/* Time */}
          <span className="text-white/40 tabular-nums">
            {timeLabel && `${timeLabel} `}{formatTimeAgo(item.timestamp)}
          </span>
        </div>
      </div>}
    </button>
  );
});
