import type { FilterType } from './FilterPills';
import { FilterPills } from './FilterPills';

interface HeaderProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  savedCount: number;
  onSearchOpen: () => void;
  onHelpOpen: () => void;
  onSettingsOpen: () => void;
}

export function Header({
  activeFilter,
  onFilterChange,
  savedCount,
  onSearchOpen,
  onHelpOpen,
  onSettingsOpen,
}: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-white/10 pt-[var(--sat)]">
      {/* Main header row */}
      <div className="h-10 md:h-8 flex items-center justify-between px-3 md:px-2">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="BNN"
            className="h-5 w-5 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="text-white font-bold text-base md:text-sm tracking-tight">BNN</h1>

          {/* Desktop: inline filter pills */}
          <div className="hidden md:block">
            <FilterPills
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
              savedCount={savedCount}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onSearchOpen}
            className="text-white/50 hover:text-white p-2 md:p-1 rounded hover:bg-white/10 active:bg-white/20"
            aria-label="Search"
            title="Search (/)"
          >
            <svg className="w-4 h-4 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={onHelpOpen}
            className="hidden md:block text-white/50 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Shortcuts"
            title="Shortcuts (?)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={onSettingsOpen}
            className="text-white/50 hover:text-white p-2 md:p-1 rounded hover:bg-white/10 active:bg-white/20"
            aria-label="Settings"
            title="Settings (Ctrl+,)"
          >
            <svg className="w-4 h-4 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile: filter pills below header */}
      <div className="md:hidden overflow-x-auto scrollbar-hide border-t border-white/5">
        <FilterPills
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          savedCount={savedCount}
        />
      </div>
    </header>
  );
}
