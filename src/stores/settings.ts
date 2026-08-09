/**
 * Settings Store - localStorage persistence for user preferences
 */

export interface SourceConfig {
  id: string;
  name: string;
  enabled: boolean;
  category: 'news' | 'tech' | 'science' | 'social' | 'finance' | 'local' | 'custom';
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
  { id: 'gdelt', name: 'GDELT', enabled: true, category: 'news', priority: 25 },
  { id: 'rfi', name: 'RFI', enabled: true, category: 'news', priority: 26 },
  { id: 'the-hindu', name: 'The Hindu', enabled: true, category: 'news', priority: 28 },
  { id: 'indian-express', name: 'Indian Express', enabled: true, category: 'news', priority: 29 },
  { id: 'scmp', name: 'SCMP', enabled: true, category: 'news', priority: 30 },
  { id: 'el-pais', name: 'El Pais', enabled: true, category: 'news', priority: 31 },
  { id: 'euronews', name: 'Euronews', enabled: true, category: 'news', priority: 32 },
  { id: 'new-humanitarian', name: 'The New Humanitarian', enabled: true, category: 'news', priority: 33 },
  { id: 'african-arguments', name: 'African Arguments', enabled: true, category: 'news', priority: 34 },
  { id: 'the-conversation', name: 'The Conversation', enabled: true, category: 'news', priority: 35 },
  { id: 'white-house', name: 'White House', enabled: true, category: 'news', priority: 36 },
  { id: 'defense', name: 'Defense.gov', enabled: true, category: 'news', priority: 37 },
  { id: 'congress', name: 'Congress.gov', enabled: true, category: 'news', priority: 38 },
  { id: 'cisa', name: 'CISA', enabled: true, category: 'news', priority: 39 },
  { id: 'noaa', name: 'NOAA', enabled: true, category: 'news', priority: 40 },
  { id: 'sec', name: 'SEC', enabled: true, category: 'news', priority: 41 },
  { id: 'federal-reserve', name: 'Federal Reserve', enabled: true, category: 'news', priority: 42 },
  { id: 'bls', name: 'BLS', enabled: true, category: 'news', priority: 43 },
  { id: 'eia', name: 'EIA', enabled: true, category: 'news', priority: 44 },
  { id: 'fda-press-releases', name: 'FDA Press Releases', enabled: true, category: 'news', priority: 45 },
  { id: 'fda-recalls', name: 'FDA Recalls', enabled: true, category: 'news', priority: 46 },
  { id: 'cdc-travel-notices', name: 'CDC Travel Notices', enabled: true, category: 'news', priority: 47 },
  { id: 'factcheck', name: 'FactCheck.org', enabled: true, category: 'news', priority: 48 },
  { id: 'snopes', name: 'Snopes', enabled: true, category: 'news', priority: 49 },
  { id: 'icij', name: 'ICIJ', enabled: true, category: 'news', priority: 50 },
  { id: 'bellingcat', name: 'Bellingcat', enabled: true, category: 'news', priority: 51 },
  // Tech
  { id: 'hackernews', name: 'Hacker News', enabled: true, category: 'tech', priority: 52 },
  { id: 'arstechnica', name: 'Ars Technica', enabled: true, category: 'tech', priority: 53 },
  { id: 'theverge', name: 'The Verge', enabled: true, category: 'tech', priority: 54 },
  { id: 'techcrunch', name: 'TechCrunch', enabled: true, category: 'tech', priority: 55 },
  { id: 'wired', name: 'Wired', enabled: true, category: 'tech', priority: 60 },
  { id: 'lobsters', name: 'Lobsters', enabled: true, category: 'tech', priority: 61 },
  { id: 'mit-tech-review', name: 'MIT Technology Review', enabled: true, category: 'tech', priority: 62 },
  { id: 'bleepingcomputer', name: 'BleepingComputer', enabled: true, category: 'tech', priority: 63 },
  { id: 'rest-of-world', name: 'Rest of World', enabled: true, category: 'tech', priority: 64 },
  { id: 'the-register', name: 'The Register', enabled: true, category: 'tech', priority: 65 },
  { id: '404-media', name: '404 Media', enabled: true, category: 'tech', priority: 66 },
  { id: 'krebs', name: 'KrebsOnSecurity', enabled: true, category: 'tech', priority: 67 },
  { id: 'dark-reading', name: 'Dark Reading', enabled: true, category: 'tech', priority: 68 },
  { id: 'ieee-spectrum', name: 'IEEE Spectrum', enabled: true, category: 'tech', priority: 69 },
  { id: 'the-markup', name: 'The Markup', enabled: true, category: 'tech', priority: 70 },
  { id: 'github-engineering', name: 'GitHub Engineering', enabled: true, category: 'tech', priority: 71 },
  { id: 'github-security', name: 'GitHub Security', enabled: true, category: 'tech', priority: 72 },
  { id: 'openai-news', name: 'OpenAI News', enabled: true, category: 'tech', priority: 73 },
  { id: 'google-ai', name: 'Google AI', enabled: true, category: 'tech', priority: 74 },
  { id: 'aws-news', name: 'AWS News', enabled: true, category: 'tech', priority: 75 },
  { id: 'cloudflare', name: 'Cloudflare', enabled: true, category: 'tech', priority: 76 },
  // Social
  { id: 'lemmy-news', name: 'Lemmy c/news', apiSources: ['c/news'], enabled: true, category: 'social', priority: 36 },
  { id: 'lemmy-world', name: 'Lemmy c/world', apiSources: ['c/world'], enabled: true, category: 'social', priority: 37 },
  { id: 'lemmy-technology', name: 'Lemmy c/technology', apiSources: ['c/technology'], enabled: true, category: 'social', priority: 38 },
  { id: 'lemmy-politics', name: 'Lemmy c/politics', apiSources: ['c/politics'], enabled: true, category: 'social', priority: 39 },
  { id: 'lemmy-science', name: 'Lemmy c/science', apiSources: ['c/science'], enabled: true, category: 'social', priority: 40 },
  { id: 'bluesky-discover', name: 'Bluesky Discover', enabled: true, category: 'social', priority: 41 },
  { id: 'mastodon-trending', name: 'Mastodon Trending', enabled: true, category: 'social', priority: 42 },
  { id: '4chan-news', name: '4chan /news/', apiSources: ['/news/'], enabled: true, category: 'social', priority: 43 },
  { id: '4chan-pol', name: '4chan /pol/', apiSources: ['/pol/'], enabled: true, category: 'social', priority: 44 },
  { id: '4chan-lit', name: '4chan /lit/', apiSources: ['/lit/'], enabled: true, category: 'social', priority: 45 },
  // Science news
  { id: 'science-daily', name: 'ScienceDaily', enabled: true, category: 'science', priority: 46 },
  { id: 'phys-org', name: 'Phys.org', enabled: true, category: 'science', priority: 47 },
  { id: 'science-news', name: 'Science News', enabled: true, category: 'science', priority: 48 },
  { id: 'live-science', name: 'Live Science', enabled: true, category: 'science', priority: 49 },
  { id: 'quanta-magazine', name: 'Quanta Magazine', enabled: true, category: 'science', priority: 50 },
  { id: 'nasa', name: 'NASA', enabled: true, category: 'science', priority: 51 },
  { id: 'aaas-science-news', name: 'AAAS Science News', enabled: true, category: 'science', priority: 52 },
  // Journals
  { id: 'nature', name: 'Nature', enabled: true, category: 'science', priority: 53 },
  { id: 'science-journal', name: 'Science', enabled: true, category: 'science', priority: 54 },
  { id: 'pnas', name: 'PNAS', enabled: true, category: 'science', priority: 55 },
  { id: 'cell', name: 'Cell', enabled: true, category: 'science', priority: 56 },
  { id: 'science-advances', name: 'Science Advances', enabled: true, category: 'science', priority: 57 },
  { id: 'elife', name: 'eLife', enabled: true, category: 'science', priority: 58 },
  { id: 'plos-one', name: 'PLOS ONE', enabled: true, category: 'science', priority: 59 },
  { id: 'the-lancet', name: 'The Lancet', enabled: true, category: 'science', priority: 60 },
  { id: 'nejm', name: 'NEJM', enabled: true, category: 'science', priority: 61 },
  // Psychology and human factors
  { id: 'aps-psychology', name: 'APS Psychology', enabled: true, category: 'science', priority: 62 },
  { id: 'neuroscience-news-psychology', name: 'Neuroscience News Psychology', enabled: true, category: 'science', priority: 63 },
  { id: 'frontiers-psychology', name: 'Frontiers in Psychology', enabled: true, category: 'science', priority: 64 },
  { id: 'human-factors', name: 'Human Factors', enabled: true, category: 'science', priority: 65 },
  { id: 'ergonomics', name: 'Ergonomics', enabled: true, category: 'science', priority: 66 },
  { id: 'carbon-brief', name: 'Carbon Brief', enabled: true, category: 'science', priority: 77 },
  { id: 'mongabay', name: 'Mongabay', enabled: true, category: 'science', priority: 78 },
  { id: 'stat', name: 'STAT', enabled: true, category: 'science', priority: 79 },
  { id: 'who', name: 'WHO', enabled: true, category: 'science', priority: 80 },
  { id: 'undark', name: 'Undark', enabled: true, category: 'science', priority: 81 },
  { id: 'usgs-earthquakes', name: 'USGS Earthquakes', enabled: true, category: 'science', priority: 82 },
  // Local news for Washington, DC and Alexandria
  { id: 'wtop', name: 'WTOP', enabled: true, category: 'local', priority: 83 },
  { id: 'wamu', name: 'WAMU', enabled: true, category: 'local', priority: 84 },
  { id: 'alexandria-city', name: 'Alexandria City', enabled: true, category: 'local', priority: 85 },
  { id: 'alexandria-times', name: 'Alexandria Times', enabled: true, category: 'local', priority: 86 },
  { id: 'alxnow', name: 'ALXnow', enabled: true, category: 'local', priority: 87 },
  { id: 'virginia-mercury', name: 'Virginia Mercury', enabled: true, category: 'local', priority: 88 },
  { id: 'washington-post-local', name: 'Washington Post Local', enabled: true, category: 'local', priority: 89 },
  { id: 'dc-news-now', name: 'DC News Now', enabled: true, category: 'local', priority: 90 },
  { id: 'washington-city-paper', name: 'Washington City Paper', enabled: true, category: 'local', priority: 91 },
  { id: 'washington-blade', name: 'Washington Blade', enabled: true, category: 'local', priority: 92 },
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
    customFeeds: settings.customFeeds.map(s =>
      s.id === sourceId ? { ...s, enabled: !s.enabled } : s
    ),
  };
}

export function setAllSources(settings: Settings, enabled: boolean): Settings {
  const allSources = [...settings.sources, ...settings.customFeeds];
  if (allSources.every(source => source.enabled === enabled)) return settings;
  return {
    ...settings,
    sources: settings.sources.map(source => ({ ...source, enabled })),
    customFeeds: settings.customFeeds.map(source => ({ ...source, enabled })),
  };
}

export function updateLocation(settings: Settings, zip: string, city: string): Settings {
  return {
    ...settings,
    location: { ...settings.location, zip, city },
  };
}

export { DEFAULT_SETTINGS };
