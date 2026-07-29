import { lazy, Suspense } from 'react';
import { Weather } from './Weather';
import { Predictions } from './Predictions';
import { Financial } from './Financial';
import { PaneResizeHandle } from './PaneResizeHandle';
import type { PaneSizes } from '../stores/settings';

const Globe = lazy(() => import('./Globe').then(m => ({ default: m.Globe })));
type SidebarPane = Exclude<keyof PaneSizes, 'sidebarWidth'>;

interface SidebarProps {
  zip: string;
  collapsedSections: string[];
  onToggleSection: (sectionId: string) => void;
  paneSizes: PaneSizes;
  onResizePane: (pane: keyof PaneSizes, delta: number) => void;
}

function SidebarSection({
  title,
  collapsed,
  onToggle,
  children,
  height,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  height: number;
}) {
  return (
    <div
      className="border-b border-white/10 flex flex-col min-h-0 shrink-0"
      style={collapsed ? undefined : { height }}
    >
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

export function Sidebar({
  zip,
  collapsedSections,
  onToggleSection,
  paneSizes,
  onResizePane,
}: SidebarProps) {
  const sections: Array<{
    id: string;
    title: string;
    pane: SidebarPane;
    content: React.ReactNode;
  }> = [
    {
      id: 'weather',
      title: 'Weather',
      pane: 'weatherHeight',
      content: <Weather zip={zip} />,
    },
    {
      id: 'globe',
      title: 'Globe',
      pane: 'globeHeight',
      content: (
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-white/50 text-xs">
            Loading globe...
          </div>
        }>
          <Globe />
        </Suspense>
      ),
    },
    {
      id: 'predictions',
      title: 'Predictions',
      pane: 'predictionsHeight',
      content: <Predictions />,
    },
    {
      id: 'markets',
      title: 'Markets',
      pane: 'marketsHeight',
      content: <Financial />,
    },
  ];

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 border-l border-white/10 bg-[#0a0a0a] overflow-y-auto feed-scroll"
      style={{ width: paneSizes.sidebarWidth }}
    >
      {sections.map(section => {
        const collapsed = collapsedSections.includes(section.id);
        return (
          <div key={section.id} className="shrink-0">
            <SidebarSection
              title={section.title}
              collapsed={collapsed}
              onToggle={() => onToggleSection(section.id)}
              height={paneSizes[section.pane]}
            >
              <div className="h-full min-h-0">{section.content}</div>
            </SidebarSection>
            {!collapsed && (
              <PaneResizeHandle
                orientation="horizontal"
                label={`Resize ${section.title} pane`}
                onResize={delta => onResizePane(section.pane, delta)}
                className="flex"
              />
            )}
          </div>
        );
      })}
    </aside>
  );
}
