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
  sourcePolicyVersion: number;
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
  { id: 'fda-press-releases', name: 'FDA Press Releases', enabled: true, category: 'news', priority: 45 },
  { id: 'fda-recalls', name: 'FDA Recalls', enabled: true, category: 'news', priority: 46 },
  { id: 'cdc-travel-notices', name: 'CDC Travel Notices', enabled: true, category: 'news', priority: 47 },
  { id: 'factcheck', name: 'FactCheck.org', enabled: true, category: 'news', priority: 48 },
  { id: 'snopes', name: 'Snopes', enabled: true, category: 'news', priority: 49 },
  { id: 'icij', name: 'ICIJ', enabled: true, category: 'news', priority: 50 },
  { id: 'bellingcat', name: 'Bellingcat', enabled: true, category: 'news', priority: 51 },
  // Tech
  { id: '4chan-g', name: '4chan /g/', apiSources: ['/g/'], enabled: false, category: 'tech', priority: 77 },
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
  { id: 'bluesky-discover', name: 'Bluesky Discover', enabled: false, category: 'social', priority: 41 },
  { id: 'mastodon-trending', name: 'Mastodon Trending', enabled: true, category: 'social', priority: 42 },
  { id: '4chan-news', name: '4chan /news/', apiSources: ['/news/'], enabled: false, category: 'social', priority: 43 },
  { id: '4chan-pol', name: '4chan /pol/', apiSources: ['/pol/'], enabled: false, category: 'social', priority: 44 },
  { id: '4chan-lit', name: '4chan /lit/', apiSources: ['/lit/'], enabled: false, category: 'social', priority: 45 },
  { id: '4chan-his', name: '4chan /his/', apiSources: ['/his/'], enabled: false, category: 'social', priority: 46 },
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
  { id: 'karl-friston', name: 'Karl Friston', enabled: true, category: 'science', priority: 82 },
  { id: 'michael-levin', name: 'Michael Levin', enabled: true, category: 'science', priority: 83 },
  { id: 'chris-fields', name: 'Chris Fields', enabled: true, category: 'science', priority: 84 },
  { id: 'geoffrey-hinton', name: 'Geoffrey Hinton', enabled: true, category: 'science', priority: 85 },
  { id: 'yann-lecun', name: 'Yann LeCun', enabled: true, category: 'science', priority: 86 },
  { id: 'percy-liang', name: 'Percy Liang', enabled: true, category: 'science', priority: 87 },
  { id: 'stuart-russell', name: 'Stuart Russell', enabled: true, category: 'science', priority: 88 },
  { id: 'yoshua-bengio', name: 'Yoshua Bengio', enabled: true, category: 'science', priority: 119 },
  { id: 'fei-fei-li', name: 'Fei-Fei Li', enabled: true, category: 'science', priority: 120 },
  { id: 'yejin-choi', name: 'Yejin Choi', enabled: true, category: 'science', priority: 121 },
  { id: 'dawn-song', name: 'Dawn Song', enabled: true, category: 'science', priority: 122 },
  { id: 'chris-olah', name: 'Chris Olah', enabled: true, category: 'science', priority: 123 },
  { id: 'neel-nanda', name: 'Neel Nanda', enabled: true, category: 'science', priority: 124 },
  { id: 'paul-christiano', name: 'Paul Christiano', enabled: true, category: 'science', priority: 125 },
  { id: 'dan-hendrycks', name: 'Dan Hendrycks', enabled: true, category: 'science', priority: 126 },
  // Climate scientists (identity-matched publications)
  { id: 'myles-allen', name: 'Myles Allen', enabled: true, category: 'science', priority: 89 },
  { id: 'piers-forster', name: 'Piers Forster', enabled: true, category: 'science', priority: 90 },
  { id: 'gavin-schmidt', name: 'Gavin Schmidt', enabled: true, category: 'science', priority: 91 },
  { id: 'friederike-otto', name: 'Friederike Otto', enabled: true, category: 'science', priority: 92 },
  { id: 'richard-alley', name: 'Richard Alley', enabled: true, category: 'science', priority: 93 },
  { id: 'corinne-le-quere', name: 'Corinne Le Quéré', enabled: true, category: 'science', priority: 94 },
  { id: 'marshall-burke', name: 'Marshall Burke', enabled: true, category: 'science', priority: 95 },
  { id: 'jesse-jenkins', name: 'Jesse Jenkins', enabled: true, category: 'science', priority: 96 },
  { id: 'michael-mann', name: 'Michael Mann', enabled: true, category: 'science', priority: 97 },
  { id: 'zeke-hausfather', name: 'Zeke Hausfather', enabled: true, category: 'science', priority: 98 },
  // Aging, nutrition, and metabolic health publications
  { id: 'matt-kaeberlein', name: 'Matt Kaeberlein', enabled: true, category: 'science', priority: 99 },
  { id: 'valter-longo', name: 'Valter Longo', enabled: true, category: 'science', priority: 100 },
  { id: 'david-sinclair', name: 'David Sinclair', enabled: true, category: 'science', priority: 101 },
  { id: 'steve-horvath', name: 'Steve Horvath', enabled: true, category: 'science', priority: 102 },
  { id: 'michael-snyder', name: 'Michael Snyder', enabled: true, category: 'science', priority: 103 },
  { id: 'herman-pontzer', name: 'Herman Pontzer', enabled: true, category: 'science', priority: 104 },
  { id: 'vishwa-deep-dixit', name: 'Vishwa Deep Dixit', enabled: true, category: 'science', priority: 105 },
  { id: 'rhonda-patrick', name: 'Rhonda Patrick', enabled: true, category: 'science', priority: 106 },
  { id: 'peter-attia', name: 'Peter Attia', enabled: true, category: 'science', priority: 107 },
  { id: 'chris-masterjohn', name: 'Chris Masterjohn', enabled: true, category: 'science', priority: 108 },
  // Exoplanets, astrobiology, and planetary science publications
  { id: 'lisa-kaltenegger', name: 'Lisa Kaltenegger', enabled: true, category: 'science', priority: 109 },
  { id: 'nikku-madhusudhan', name: 'Nikku Madhusudhan', enabled: true, category: 'science', priority: 110 },
  { id: 'sara-seager', name: 'Sara Seager', enabled: true, category: 'science', priority: 111 },
  { id: 'david-kipping', name: 'David Kipping', enabled: true, category: 'science', priority: 112 },
  { id: 'victoria-meadows', name: 'Victoria Meadows', enabled: true, category: 'science', priority: 113 },
  { id: 'ravi-kopparapu', name: 'Ravi Kopparapu', enabled: true, category: 'science', priority: 114 },
  { id: 'jessie-christiansen', name: 'Jessie Christiansen', enabled: true, category: 'science', priority: 115 },
  { id: 'kevin-hand', name: 'Kevin Hand', enabled: true, category: 'science', priority: 116 },
  { id: 'sara-imari-walker', name: 'Sara Imari Walker', enabled: true, category: 'science', priority: 117 },
  { id: 'jason-wright', name: 'Jason Wright', enabled: true, category: 'science', priority: 118 },
  // Genome engineering and synthetic biology publications
  { id: 'jennifer-doudna', name: 'Jennifer Doudna', enabled: true, category: 'science', priority: 127 },
  { id: 'feng-zhang', name: 'Feng Zhang', enabled: true, category: 'science', priority: 128 },
  { id: 'david-liu', name: 'David Liu', enabled: true, category: 'science', priority: 129 },
  { id: 'george-church', name: 'George Church', enabled: true, category: 'science', priority: 130 },
  { id: 'jay-keasling', name: 'Jay Keasling', enabled: true, category: 'science', priority: 131 },
  { id: 'james-collins', name: 'James Collins', enabled: true, category: 'science', priority: 132 },
  { id: 'pamela-silver', name: 'Pamela Silver', enabled: true, category: 'science', priority: 133 },
  { id: 'drew-endy', name: 'Drew Endy', enabled: true, category: 'science', priority: 134 },
  { id: 'timothy-lu', name: 'Timothy Lu', enabled: true, category: 'science', priority: 135 },
  { id: 'cameron-myhrvold', name: 'Cameron Myhrvold', enabled: true, category: 'science', priority: 136 },
  { id: 'daily-maverick', name: 'Daily Maverick', enabled: true, category: 'news', priority: 35 },
  { id: 'global-voices', name: 'Global Voices', enabled: true, category: 'news', priority: 35 },
  { id: 'kff-health-news', name: 'KFF Health News', enabled: true, category: 'science', priority: 81 },
  { id: 'wmata-alerts', name: 'WMATA Alerts', enabled: true, category: 'local', priority: 81 },
  { id: 'alexandria-council', name: 'Alexandria Council', enabled: true, category: 'local', priority: 81 },
  { id: 'bea', name: 'BEA', enabled: true, category: 'finance', priority: 41 },
  { id: 'ustr', name: 'USTR', enabled: true, category: 'finance', priority: 41 },
  { id: 'federal-register-trade', name: 'Federal Register Trade', enabled: true, category: 'finance', priority: 41 },
  { id: 'sec-ipo-filings', name: 'SEC IPO Filings', enabled: true, category: 'finance', priority: 41 },
  { id: 'sec-foreign-ipo-filings', name: 'SEC Foreign IPO Filings', enabled: true, category: 'finance', priority: 41 },
  { id: 'bank-of-japan', name: 'Bank of Japan', enabled: true, category: 'finance', priority: 41 },
  { id: 'cftc', name: 'CFTC', enabled: true, category: 'finance', priority: 41 },
  { id: 'ethereum-foundation', name: 'Ethereum Foundation', enabled: true, category: 'finance', priority: 75 },
  // Finance reporting and primary economic releases
  { id: 'bloomberg', name: 'Bloomberg', enabled: true, category: 'finance', priority: 10 },
  { id: 'financial-times', name: 'Financial Times', enabled: true, category: 'finance', priority: 11 },
  { id: 'wall-street-journal', name: 'Wall Street Journal', enabled: true, category: 'finance', priority: 12 },
  { id: 'sec', name: 'SEC', enabled: true, category: 'finance', priority: 41 },
  { id: 'federal-reserve', name: 'Federal Reserve', enabled: true, category: 'finance', priority: 42 },
  { id: 'bls', name: 'BLS', enabled: true, category: 'finance', priority: 43 },
  { id: 'eia', name: 'EIA', enabled: true, category: 'finance', priority: 44 },
  { id: 'cnbc-economy', name: 'CNBC Economy', enabled: true, category: 'finance', priority: 137 },
  { id: 'cnbc-ipos', name: 'CNBC IPOs', enabled: true, category: 'finance', priority: 138 },
  { id: 'coindesk', name: 'CoinDesk', enabled: true, category: 'finance', priority: 139 },
  { id: 'bbc-business', name: 'BBC Business', enabled: true, category: 'finance', priority: 140 },
  { id: 'guardian-business', name: 'Guardian Business', enabled: true, category: 'finance', priority: 141 },
  { id: 'ecb', name: 'ECB', enabled: true, category: 'finance', priority: 142 },
  { id: 'wto-news', name: 'WTO News', enabled: true, category: 'finance', priority: 143 },
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
  sourcePolicyVersion: 1,
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
        sources: mergeSourceConfigs(DEFAULT_SOURCES, parsed.sources || [], (parsed.sourcePolicyVersion || 0) < 1),
        sourcePolicyVersion: 1,
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

export function mergeSourceConfigs(defaults: SourceConfig[], stored: SourceConfig[], applySourceAudit = false): SourceConfig[] {
  const storedMap = new Map(stored.map(s => [s.id, s]));
  return defaults.map(def => {
    const existing = storedMap.get(def.id);
    if (existing) {
      return { ...def, enabled: applySourceAudit && !def.enabled ? false : existing.enabled, priority: existing.priority };
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
