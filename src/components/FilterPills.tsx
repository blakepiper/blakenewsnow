export type FilterType = 'all' | 'news' | 'tech' | 'social' | 'saved';

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  savedCount?: number;
}

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'tech', label: 'Tech' },
  { id: 'social', label: 'Social' },
  { id: 'saved', label: 'Saved' },
];

export function FilterPills({ activeFilter, onFilterChange, savedCount = 0 }: FilterPillsProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const showCount = filter.id === 'saved' && savedCount > 0;

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            {filter.label}
            {showCount && (
              <span className="ml-1 text-yellow-400">{savedCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
