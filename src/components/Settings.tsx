import { useState, useEffect, useRef } from 'react';
import type { Settings as SettingsType, SourceConfig } from '../stores/settings';
import { UI_TIMING } from '../config';

interface SettingsProps {
  settings: SettingsType;
  onClose: () => void;
  onToggleSource: (sourceId: string) => void;
  onUpdateLocation: (zip: string, city: string) => void;
  onAddCustomFeed: (name: string, url: string) => void;
  onRemoveCustomFeed: (feedId: string) => void;
  onSetLayout: (layout: 'compact' | 'dashboard') => void;
}

type Tab = 'sources' | 'location' | 'custom' | 'display';

function SourceToggle({ source, onToggle }: { source: SourceConfig; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
        source.enabled ? 'bg-white/5 hover:bg-white/10' : 'opacity-50 hover:bg-white/5'
      }`}
    >
      <span className="text-white/90 text-sm">{source.name}</span>
      <div className={`w-8 h-5 rounded-full transition-colors ${source.enabled ? 'bg-blue-500' : 'bg-white/20'}`}>
        <div
          className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${
            source.enabled ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}

export function Settings({
  settings,
  onClose,
  onToggleSource,
  onUpdateLocation,
  onAddCustomFeed,
  onRemoveCustomFeed,
  onSetLayout,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('sources');
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [zipInput, setZipInput] = useState(settings.location.zip);
  const [locationSaved, setLocationSaved] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleSaveLocation = () => {
    onUpdateLocation(zipInput, '');
    setLocationSaved(true);

    // Clear any existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      setLocationSaved(false);
      saveTimerRef.current = null;
    }, UI_TIMING.feedbackDuration);
  };

  const handleAddFeed = () => {
    if (newFeedName.trim() && newFeedUrl.trim()) {
      onAddCustomFeed(newFeedName.trim(), newFeedUrl.trim());
      setNewFeedName('');
      setNewFeedUrl('');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'sources',
      label: 'Sources',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      id: 'location',
      label: 'Location',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'custom',
      label: 'Custom Feeds',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: 'display',
      label: 'Display',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
  ];

  // Group sources by category
  const sourcesByCategory = settings.sources.reduce((acc, source) => {
    if (!acc[source.category]) acc[source.category] = [];
    acc[source.category].push(source);
    return acc;
  }, {} as Record<string, SourceConfig[]>);

  const categoryLabels: Record<string, string> = {
    news: 'News',
    tech: 'Technology',
    social: 'Social',
    finance: 'Finance',
    custom: 'Custom',
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-white text-lg font-medium">Settings</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-blue-500 -mb-px'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'sources' && (
            <div className="space-y-6">
              {Object.entries(sourcesByCategory).map(([category, sources]) => (
                <div key={category}>
                  <h3 className="text-white/50 text-xs font-medium uppercase tracking-wide mb-2">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {sources.map(source => (
                      <SourceToggle
                        key={source.id}
                        source={source}
                        onToggle={() => onToggleSource(source.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">ZIP Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zipInput}
                    onChange={e => setZipInput(e.target.value)}
                    placeholder="e.g., 22314"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/50 outline-none focus:border-blue-500 transition-colors"
                    maxLength={5}
                  />
                  <button
                    onClick={handleSaveLocation}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      locationSaved
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {locationSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
                <p className="text-white/40 text-xs mt-2">
                  Enter your ZIP code for local weather data.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h3 className="text-white/70 text-sm mb-2">Current Location</h3>
                <p className="text-white/90">{settings.location.city || settings.location.zip}</p>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white/70 text-sm mb-2">Add Custom RSS Feed</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newFeedName}
                    onChange={e => setNewFeedName(e.target.value)}
                    placeholder="Feed name"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/50 outline-none focus:border-blue-500 transition-colors"
                  />
                  <input
                    type="url"
                    value={newFeedUrl}
                    onChange={e => setNewFeedUrl(e.target.value)}
                    placeholder="RSS feed URL"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/50 outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleAddFeed}
                    disabled={!newFeedName.trim() || !newFeedUrl.trim()}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/50 text-white rounded font-medium transition-colors"
                  >
                    Add Feed
                  </button>
                </div>
              </div>

              {settings.customFeeds.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-white/70 text-sm mb-2">Your Custom Feeds</h3>
                  <div className="space-y-2">
                    {settings.customFeeds.map(feed => (
                      <div
                        key={feed.id}
                        className="flex items-center justify-between p-2 bg-white/5 rounded"
                      >
                        <div>
                          <div className="text-white/90 text-sm">{feed.name}</div>
                          <div className="text-white/40 text-xs truncate max-w-xs">{feed.url}</div>
                        </div>
                        <button
                          onClick={() => onRemoveCustomFeed(feed.id)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white/70 text-sm mb-2">Layout</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSetLayout('compact')}
                    className={`p-4 rounded border transition-colors ${
                      settings.layout === 'compact'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-white/90 text-sm font-medium mb-1">Compact</div>
                    <div className="text-white/40 text-xs">Single column layout</div>
                  </button>
                  <button
                    onClick={() => onSetLayout('dashboard')}
                    className={`p-4 rounded border transition-colors ${
                      settings.layout === 'dashboard'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-white/90 text-sm font-medium mb-1">Dashboard</div>
                    <div className="text-white/40 text-xs">Multi-column grid</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          <p className="text-white/50 text-xs text-center">
            Press <kbd className="px-1 border border-white/20 rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
