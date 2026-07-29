import { useState, useEffect, useCallback } from 'react';
import type { PaneSizes, Settings, SourceConfig } from '../stores/settings';
import {
  loadSettings,
  saveSettings,
  toggleSource,
  updateLocation,
  addCustomFeed,
  removeCustomFeed,
  markAsRead,
  updatePaneSize,
} from '../stores/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((updater: (prev: Settings) => Settings) => {
    setSettings(updater);
  }, []);

  const handleToggleSource = useCallback((sourceId: string) => {
    setSettings(prev => toggleSource(prev, sourceId));
  }, []);

  const handleUpdateLocation = useCallback((zip: string, city: string) => {
    setSettings(prev => updateLocation(prev, zip, city));
  }, []);

  const handleAddCustomFeed = useCallback((name: string, url: string) => {
    setSettings(prev => addCustomFeed(prev, name, url));
  }, []);

  const handleRemoveCustomFeed = useCallback((feedId: string) => {
    setSettings(prev => removeCustomFeed(prev, feedId));
  }, []);

  const handleMarkAsRead = useCallback((articleId: string) => {
    setSettings(prev => markAsRead(prev, articleId));
  }, []);

  const handleSetLayout = useCallback((layout: 'compact' | 'dashboard') => {
    setSettings(prev => ({ ...prev, layout }));
  }, []);

  const handleToggleSection = useCallback((sectionId: string) => {
    setSettings(prev => ({
      ...prev,
      collapsedSections: prev.collapsedSections.includes(sectionId)
        ? prev.collapsedSections.filter(id => id !== sectionId)
        : [...prev.collapsedSections, sectionId],
    }));
  }, []);

  const handleResizePane = useCallback((pane: keyof PaneSizes, delta: number) => {
    setSettings(prev => updatePaneSize(prev, pane, prev.paneSizes[pane] + delta));
  }, []);

  const handleReorderSources = useCallback((sources: SourceConfig[]) => {
    setSettings(prev => ({
      ...prev,
      sources: sources.map((s, idx) => ({ ...s, priority: idx })),
    }));
  }, []);

  const isRead = useCallback((articleId: string) => {
    return settings.readArticles.includes(articleId);
  }, [settings.readArticles]);

  return {
    settings,
    updateSettings,
    toggleSource: handleToggleSource,
    updateLocation: handleUpdateLocation,
    addCustomFeed: handleAddCustomFeed,
    removeCustomFeed: handleRemoveCustomFeed,
    markAsRead: handleMarkAsRead,
    setLayout: handleSetLayout,
    toggleSection: handleToggleSection,
    resizePane: handleResizePane,
    reorderSources: handleReorderSources,
    isRead,
  };
}
