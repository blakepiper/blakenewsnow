/**
 * Settings Store - localStorage persistence for user preferences
 */

export interface SourceConfig {
  id: string;
  name: string;
  enabled: boolean;
  category: 'news' | 'tech' | 'social' | 'finance' | 'custom';
  priority: number;
  apiSources?: string[];
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
  paneSizes: PaneSizes;

  // Display
  refreshInterval: number;
  maxHeadlines: number;
  showSourceIcons: boolean;

  readArticles: string[];
}

export interface PaneSizes {
  sidebarWidth: number;
  weatherHeight: number;
  globeHeight: number;
  predictionsHeight: number;
  marketsHeight: number;
}

const DEFAULT_SOURCES: SourceConfig[] = [
  // News
  { id: 'npr', name: 'NPR', enabled: true, category: 'news', priority: 1 },
  { id: 'bbc', name: 'BBC', enabled: true, category: 'news', priority: 2 },
  { id: 'cbc', name: 'CBC News', enabled: true, category: 'news', priority: 3 },
  { id: 'dw', name: 'DW', enabled: true, category: 'news', priority: 4 },
  { id: 'guardian', name: 'Guardian', enabled: true, category: 'news', priority: 5 },
  { id: 'aljazeera', name: 'Al Jazeera', enabled: true, category: 'news', priority: 6 },
  { id: 'abc', name: 'ABC News', enabled: true, category: 'news', priority: 7 },
  { id: 'cbs', name: 'CBS News', enabled: true, category: 'news', priority: 8 },
  { id: 'nytimes', name: 'NY Times', enabled: true, category: 'news', priority: 9 },
  { id: 'bloomberg', name: 'Bloomberg', enabled: true, category: 'news', priority: 10 },
  { id: 'financial-times', name: 'Financial Times', enabled: true, category: 'news', priority: 11 },
  { id: 'wall-street-journal', name: 'Wall Street Journal', enabled: true, category: 'news', priority: 12 },
  { id: 'pbs', name: 'PBS NewsHour', enabled: true, category: 'news', priority: 13 },
  { id: 'nbc', name: 'NBC News', enabled: true, category: 'news', priority: 14 },
  { id: 'axios', name: 'Axios', enabled: true, category: 'news', priority: 15 },
  { id: 'thehill', name: 'The Hill', enabled: true, category: 'news', priority: 16 },
  { id: 'vox', name: 'Vox', enabled: true, category: 'news', priority: 17 },
  { id: 'fox', name: 'Fox News', enabled: true, category: 'news', priority: 18 },
  { id: 'politico', name: 'Politico', enabled: true, category: 'news', priority: 19 },
  { id: 'semafor', name: 'Semafor', enabled: true, category: 'news', priority: 20 },
  { id: 'intercept', name: 'The Intercept', enabled: true, category: 'news', priority: 21 },
  { id: 'propublica', name: 'ProPublica', enabled: true, category: 'news', priority: 22 },
  { id: 'foreignpolicy', name: 'Foreign Policy', enabled: true, category: 'news', priority: 23 },
  { id: 'breitbart', name: 'Breitbart', enabled: true, category: 'news', priority: 24 },
  // Tech
  { id: 'hackernews', name: 'Hacker News', enabled: true, category: 'tech', priority: 25 },
  { id: 'arstechnica', name: 'Ars Technica', enabled: true, category: 'tech', priority: 26 },
  { id: 'theverge', name: 'The Verge', enabled: true, category: 'tech', priority: 27 },
  { id: 'techcrunch', name: 'TechCrunch', enabled: true, category: 'tech', priority: 28 },
  { id: 'wired', name: 'Wired', enabled: true, category: 'tech', priority: 29 },
  { id: 'lobsters', name: 'Lobsters', enabled: true, category: 'tech', priority: 30 },
  { id: 'mit-tech-review', name: 'MIT Technology Review', enabled: true, category: 'tech', priority: 31 },
  { id: 'bleepingcomputer', name: 'BleepingComputer', enabled: true, category: 'tech', priority: 32 },
  { id: 'rest-of-world', name: 'Rest of World', enabled: true, category: 'tech', priority: 33 },
  { id: 'the-register', name: 'The Register', enabled: true, category: 'tech', priority: 34 },
  { id: '404-media', name: '404 Media', enabled: true, category: 'tech', priority: 35 },
  // Social
  { id: 'lemmy-news', name: 'Lemmy c/news', apiSources: ['c/news'], enabled: true, category: 'social', priority: 36 },
  { id: 'lemmy-world', name: 'Lemmy c/world', apiSources: ['c/world'], enabled: true, category: 'social', priority: 37 },
  { id: 'lemmy-technology', name: 'Lemmy c/technology', apiSources: ['c/technology'], enabled: true, category: 'social', priority: 38 },
  { id: '4chan-news', name: '4chan /news/', apiSources: ['/news/'], enabled: true, category: 'social', priority: 39 },
  { id: '4chan-pol', name: '4chan /pol/', apiSources: ['/pol/'], enabled: true, category: 'social', priority: 40 },
  { id: '4chan-lit', name: '4chan /lit/', apiSources: ['/lit/'], enabled: true, category: 'social', priority: 41 },
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
  paneSizes: {
    sidebarWidth: 380,
    weatherHeight: 180,
    globeHeight: 200,
    predictionsHeight: 160,
    marketsHeight: 180,
  },
  refreshInterval: 60000,
  maxHeadlines: 50,
  showSourceIcons: true,
  readArticles: [],
};

const STORAGE_KEY = 'blakenewsnow_settings';

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      delete parsed.readingList;
      // Merge with defaults to handle new fields
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        location: { ...DEFAULT_SETTINGS.location, ...parsed.location },
        paneSizes: { ...DEFAULT_SETTINGS.paneSizes, ...parsed.paneSizes },
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

export function markAsRead(settings: Settings, articleId: string): Settings {
  if (settings.readArticles.includes(articleId)) return settings;
  return {
    ...settings,
    readArticles: [...settings.readArticles, articleId],
  };
}

export function updatePaneSize(
  settings: Settings,
  pane: keyof PaneSizes,
  value: number
): Settings {
  const [minimum, maximum] = pane === 'sidebarWidth' ? [240, 560] : [100, 520];
  return {
    ...settings,
    paneSizes: {
      ...settings.paneSizes,
      [pane]: Math.round(Math.min(maximum, Math.max(minimum, value))),
    },
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
