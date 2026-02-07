import { lazy, Suspense } from 'react';
import { Weather } from './Weather';
import { Predictions } from './Predictions';
import { Financial } from './Financial';

const Globe = lazy(() => import('./Globe').then(m => ({ default: m.Globe })));

interface SidebarProps {
  zip: string;
  collapsedSections: string[];
  onToggleSection: (sectionId: string) => void;
}

function SidebarSection({
  title,
  collapsed,
  onToggle,
  children,
  className = '',
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-b border-white/10 flex flex-col min-h-0 ${collapsed ? '' : className}`}>
      <button
        onClick={onToggle}
        className="w-full px-3 py-1.5 flex items-center justify-between text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors shrink-0"
      >
        <span className="text-[10px] font-medium uppercase tracking-wide">{title}</span>
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && <div className="flex-1 min-h-0 overflow-hidden">{children}</div>}
    </div>
  );
}

export function Sidebar({ zip, collapsedSections, onToggleSection }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[380px] border-l border-white/10 bg-[#0a0a0a] overflow-hidden">
      <SidebarSection
        title="Weather"
        collapsed={collapsedSections.includes('weather')}
        onToggle={() => onToggleSection('weather')}
        className="shrink-0"
      >
        <div className="h-[180px]">
          <Weather zip={zip} />
        </div>
      </SidebarSection>

      <SidebarSection
        title="Globe"
        collapsed={collapsedSections.includes('globe')}
        onToggle={() => onToggleSection('globe')}
        className="shrink-0"
      >
        <div className="h-[200px]">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center text-white/50 text-xs">
              Loading globe...
            </div>
          }>
            <Globe />
          </Suspense>
        </div>
      </SidebarSection>

      <SidebarSection
        title="Predictions"
        collapsed={collapsedSections.includes('predictions')}
        onToggle={() => onToggleSection('predictions')}
        className="flex-1"
      >
        <Predictions />
      </SidebarSection>

      <SidebarSection
        title="Markets"
        collapsed={collapsedSections.includes('markets')}
        onToggle={() => onToggleSection('markets')}
        className="flex-1"
      >
        <Financial />
      </SidebarSection>
    </aside>
  );
}
