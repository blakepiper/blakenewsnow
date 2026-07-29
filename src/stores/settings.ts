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
  { id: 'cbc', name: 'CBC News', enabled: true, category: 'news', priority: 3 },
  { id: 'dw', name: 'DW', enabled: true, category: 'news', priority: 4 },
  { id: 'guardian', name: 'Guardian', enabled: true, category: 'news', priority: 5 },
  { id: 'aljazeera', name: 'Al Jazeera', enabled: true, category: 'news', priority: 6 },
  { id: 'abc', name: 'ABC News', enabled: true, category: 'news', priority: 7 },
  { id: 'cbs', name: 'CBS News', enabled: true, category: 'news', priority: 8 },
  { id: 'nytimes', name: 'NY Times', enabled: true, category: 'news', priority: 9 },
  { id: 'pbs', name: 'PBS NewsHour', enabled: true, category: 'news', priority: 10 },
  { id: 'nbc', name: 'NBC News', enabled: true, category: 'news', priority: 11 },
  { id: 'axios', name: 'Axios', enabled: true, category: 'news', priority: 12 },
  { id: 'thehill', name: 'The Hill', enabled: true, category: 'news', priority: 13 },
  { id: 'vox', name: 'Vox', enabled: true, category: 'news', priority: 14 },
  { id: 'fox', name: 'Fox News', enabled: true, category: 'news', priority: 15 },
  { id: 'politico', name: 'Politico', enabled: true, category: 'news', priority: 16 },
  { id: 'semafor', name: 'Semafor', enabled: true, category: 'news', priority: 17 },
  { id: 'intercept', name: 'The Intercept', enabled: true, category: 'news', priority: 18 },
  { id: 'propublica', name: 'ProPublica', enabled: true, category: 'news', priority: 19 },
  { id: 'foreignpolicy', name: 'Foreign Policy', enabled: true, category: 'news', priority: 20 },
  { id: 'breitbart', name: 'Breitbart', enabled: true, category: 'news', priority: 21 },
  // Tech
  { id: 'hackernews', name: 'Hacker News', enabled: true, category: 'tech', priority: 22 },
  { id: 'arstechnica', name: 'Ars Technica', enabled: true, category: 'tech', priority: 23 },
  { id: 'theverge', name: 'The Verge', enabled: true, category: 'tech', priority: 24 },
  { id: 'techcrunch', name: 'TechCrunch', enabled: true, category: 'tech', priority: 25 },
  { id: 'wired', name: 'Wired', enabled: true, category: 'tech', priority: 26 },
  { id: 'lobsters', name: 'Lobsters', enabled: true, category: 'tech', priority: 27 },
  { id: 'mit-tech-review', name: 'MIT Technology Review', enabled: true, category: 'tech', priority: 28 },
  { id: 'bleepingcomputer', name: 'BleepingComputer', enabled: true, category: 'tech', priority: 29 },
  { id: 'rest-of-world', name: 'Rest of World', enabled: true, category: 'tech', priority: 30 },
  { id: 'the-register', name: 'The Register', enabled: true, category: 'tech', priority: 31 },
  { id: '404-media', name: '404 Media', enabled: true, category: 'tech', priority: 32 },
  // Social
  { id: 'lemmy-news', name: 'Lemmy c/news', apiSources: ['c/news'], enabled: true, category: 'social', priority: 33 },
  { id: 'lemmy-world', name: 'Lemmy c/world', apiSources: ['c/world'], enabled: true, category: 'social', priority: 34 },
  { id: 'lemmy-technology', name: 'Lemmy c/technology', apiSources: ['c/technology'], enabled: true, category: 'social', priority: 35 },
  { id: '4chan-news', name: '4chan /news/', apiSources: ['/news/'], enabled: true, category: 'social', priority: 36 },
  { id: '4chan-pol', name: '4chan /pol/', apiSources: ['/pol/'], enabled: true, category: 'social', priority: 37 },
  { id: '4chan-lit', name: '4chan /lit/', apiSources: ['/lit/'], enabled: true, category: 'social', priority: 38 },
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
