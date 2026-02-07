import { useState } from 'react';
import { Weather } from './Weather';
import { Predictions } from './Predictions';
import { Financial } from './Financial';

interface SidebarProps {
  zip: string;
  collapsedSections: string[];
  onToggleSection: (sectionId: string) => void;
}

function SidebarSection({
  id,
  title,
  collapsed,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/10">
      <button
        onClick={onToggle}
        className="w-full px-3 py-1.5 flex items-center justify-between text-white/60 hover:text-white/80 hover:bg-white/5 transition-colors"
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
      {!collapsed && children}
    </div>
  );
}

export function Sidebar({ zip, collapsedSections, onToggleSection }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[380px] border-l border-white/10 overflow-y-auto bg-[#0a0a0a]">
      <SidebarSection
        id="weather"
        title="Weather"
        collapsed={collapsedSections.includes('weather')}
        onToggle={() => onToggleSection('weather')}
      >
        <div className="h-[160px]">
          <Weather zip={zip} />
        </div>
      </SidebarSection>

      <SidebarSection
        id="predictions"
        title="Predictions"
        collapsed={collapsedSections.includes('predictions')}
        onToggle={() => onToggleSection('predictions')}
      >
        <div className="max-h-[400px]">
          <Predictions />
        </div>
      </SidebarSection>

      <SidebarSection
        id="markets"
        title="Markets"
        collapsed={collapsedSections.includes('markets')}
        onToggle={() => onToggleSection('markets')}
      >
        <div className="max-h-[300px]">
          <Financial />
        </div>
      </SidebarSection>
    </aside>
  );
}
