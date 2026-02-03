/**
 * Settings Store - localStorage persistence for user preferences
 */

export interface SourceConfig {
  id: string;
  name: string;
  enabled: boolean;
  category: 'news' | 'tech' | 'social' | 'finance' | 'custom';
  priority: number;
  url?: string;
}

export interface Settings {
  // Location
  location: {
    zip: string;
    city: string;
    useGeolocation: boolean;
  };

  // Sources
  sources: SourceConfig[];
  customFeeds: SourceConfig[];

  // Layout
  layout: 'compact' | 'dashboard';
  collapsedSections: string[];

  // Display
  refreshInterval: number;
  maxHeadlines: number;
  showSourceIcons: boolean;

  // Reading
  readingList: string[];
  readArticles: string[];
}

const DEFAULT_SOURCES: SourceConfig[] = [
  // News
  { id: 'npr', name: 'NPR', enabled: true, category: 'news', priority: 1 },
  { id: 'bbc', name: 'BBC', enabled: true, category: 'news', priority: 2 },
  { id: 'guardian', name: 'Guardian', enabled: true, category: 'news', priority: 3 },
  { id: 'aljazeera', name: 'Al Jazeera', enabled: true, category: 'news', priority: 4 },
  { id: 'abc', name: 'ABC News', enabled: true, category: 'news', priority: 5 },
  { id: 'cbs', name: 'CBS News', enabled: true, category: 'news', priority: 6 },
  { id: 'nytimes', name: 'NY Times', enabled: true, category: 'news', priority: 7 },
  { id: 'reuters', name: 'Reuters', enabled: true, category: 'news', priority: 8 },
  { id: 'ap', name: 'Associated Press', enabled: true, category: 'news', priority: 9 },
  // Tech
  { id: 'hackernews', name: 'Hacker News', enabled: true, category: 'tech', priority: 10 },
  { id: 'arstechnica', name: 'Ars Technica', enabled: true, category: 'tech', priority: 11 },
  { id: 'theverge', name: 'The Verge', enabled: true, category: 'tech', priority: 12 },
  { id: 'techcrunch', name: 'TechCrunch', enabled: true, category: 'tech', priority: 13 },
  { id: 'wired', name: 'Wired', enabled: true, category: 'tech', priority: 14 },
  { id: 'lobsters', name: 'Lobsters', enabled: true, category: 'tech', priority: 15 },
  // Social
  { id: 'reddit-news', name: 'Reddit r/news', enabled: true, category: 'social', priority: 16 },
  { id: 'reddit-worldnews', name: 'Reddit r/worldnews', enabled: true, category: 'social', priority: 17 },
  { id: 'reddit-technology', name: 'Reddit r/technology', enabled: true, category: 'social', priority: 18 },
];

const DEFAULT_SETTINGS: Settings = {
  location: {
    zip: '22314',
    city: 'Alexandria, VA',
    useGeolocation: false,
  },
  sources: DEFAULT_SOURCES,
  customFeeds: [],
  layout: 'compact',
  collapsedSections: [],
  refreshInterval: 60000,
  maxHeadlines: 50,
  showSourceIcons: true,
  readingList: [],
  readArticles: [],
};

const STORAGE_KEY = 'blakenewsnow_settings';

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        location: { ...DEFAULT_SETTINGS.location, ...parsed.location },
        sources: mergeSourceConfigs(DEFAULT_SOURCES, parsed.sources || []),
      };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function mergeSourceConfigs(defaults: SourceConfig[], stored: SourceConfig[]): SourceConfig[] {
  const storedMap = new Map(stored.map(s => [s.id, s]));
  return defaults.map(def => {
    const existing = storedMap.get(def.id);
    if (existing) {
      return { ...def, enabled: existing.enabled, priority: existing.priority };
    }
    return def;
  });
}

export function getEnabledSources(settings: Settings): string[] {
  return settings.sources
    .filter(s => s.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(s => s.id);
}

export function getEnabledSourcesByCategory(settings: Settings, category: SourceConfig['category']): SourceConfig[] {
  return settings.sources
    .filter(s => s.enabled && s.category === category)
    .sort((a, b) => a.priority - b.priority);
}

export function addToReadingList(settings: Settings, articleId: string): Settings {
  if (settings.readingList.includes(articleId)) return settings;
  return {
    ...settings,
    readingList: [...settings.readingList, articleId],
  };
}

export function removeFromReadingList(settings: Settings, articleId: string): Settings {
  return {
    ...settings,
    readingList: settings.readingList.filter(id => id !== articleId),
  };
}

export function markAsRead(settings: Settings, articleId: string): Settings {
  if (settings.readArticles.includes(articleId)) return settings;
  return {
    ...settings,
    readArticles: [...settings.readArticles, articleId],
  };
}

export function addCustomFeed(settings: Settings, name: string, url: string): Settings {
  const id = `custom-${Date.now()}`;
  const newFeed: SourceConfig = {
    id,
    name,
    url,
    enabled: true,
    category: 'custom',
    priority: settings.customFeeds.length + 100,
  };
  return {
    ...settings,
    customFeeds: [...settings.customFeeds, newFeed],
  };
}

export function removeCustomFeed(settings: Settings, feedId: string): Settings {
  return {
    ...settings,
    customFeeds: settings.customFeeds.filter(f => f.id !== feedId),
  };
}

export function toggleSource(settings: Settings, sourceId: string): Settings {
  return {
    ...settings,
    sources: settings.sources.map(s =>
      s.id === sourceId ? { ...s, enabled: !s.enabled } : s
    ),
  };
}

export function updateLocation(settings: Settings, zip: string, city: string): Settings {
  return {
    ...settings,
    location: { ...settings.location, zip, city },
  };
}

export { DEFAULT_SETTINGS };
