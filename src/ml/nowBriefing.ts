import type { FeedItem } from '../types';

const DEFAULT_WINDOW_HOURS = 36;
const DEFAULT_MAX_ITEMS = 180;
const DEFAULT_MAX_CLUSTERS = 6;
const CLUSTER_SIMILARITY = 0.16;

const STOP_WORDS = new Set([
  'a', 'about', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'between', 'both',
  'but', 'by', 'can', 'could', 'day', 'did', 'do', 'does', 'doing', 'during', 'each',
  'for', 'from', 'further', 'get', 'gets', 'got', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'latest', 'live', 'may', 'me',
  'might', 'more', 'most', 'my', 'new', 'news', 'no', 'nor', 'not', 'now', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 'report',
  'reports', 'record', 'high', 'said', 'says', 'she', 'should', 'so', 'some', 'than', 'that', 'the',
  'their', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'today', 'too', 'under', 'up', 'us', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would',
  'you', 'your',
]);

type SparseVector = Map<string, number>;

interface Document {
  item: FeedItem;
  timestamp: number;
  tokens: string[];
  vector: SparseVector;
  canonicalLink: string;
  normalizedTitle: string;
  titleTokenSet: Set<string>;
  descriptionShingles: Set<string>;
  syndicationOrigin: string | null;
}

interface WorkingCluster {
  documents: Document[];
  centroid: SparseVector;
}

export interface BriefingCluster {
  id: string;
  headline: string;
  link: string;
  timestamp: string;
  sources: string[];
  sourceTypes: FeedItem['sourceType'][];
  keywords: string[];
  supporting: Array<{
    id: string;
    headline: string;
    link: string;
    source: string;
  }>;
  itemCount: number;
  independentReportCount: number;
  publisherCount: number;
  coverage: 'broad coverage' | 'multi-source' | 'developing' | 'syndicated' | 'single report';
  score: number;
}

export interface NowBriefing {
  generatedAt: string;
  analyzedCount: number;
  windowHours: number;
  clusters: BriefingCluster[];
}

export interface BriefingOptions {
  now?: number;
  windowHours?: number;
  maxItems?: number;
  maxClusters?: number;
}

export interface RelatedFeedItem {
  item: FeedItem;
  similarity: number;
  sharedTerms: string[];
}

function stem(token: string): string {
  if (token.endsWith("'s")) token = token.slice(0, -2);
  if (token.length > 6 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 5 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokenize(title: string): string[] {
  return (title.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [])
    .map(stem)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
}

function normalizedText(value: string): string {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(' ');
}

function canonicalLink(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.hostname = url.hostname.replace(/^www\./, '').toLocaleLowerCase();
    [
      'fbclid',
      'gclid',
      'mc_cid',
      'mc_eid',
      'ref',
      'source',
    ].forEach(parameter => url.searchParams.delete(parameter));
    [...url.searchParams.keys()]
      .filter(parameter => parameter.toLocaleLowerCase().startsWith('utm_'))
      .forEach(parameter => url.searchParams.delete(parameter));
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return value.trim();
  }
}

function wordShingles(value: string, width = 3): Set<string> {
  const words = tokenize(value);
  if (words.length < width) return new Set(words.length > 0 ? [words.join(' ')] : []);
  return new Set(
    Array.from(
      { length: words.length - width + 1 },
      (_, index) => words.slice(index, index + width).join(' ')
    )
  );
}

function setContainment(left: Set<string>, right: Set<string>): number {
  const smallerSize = Math.min(left.size, right.size);
  if (smallerSize === 0) return 0;
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let shared = 0;
  smaller.forEach(value => {
    if (larger.has(value)) shared += 1;
  });
  return shared / smallerSize;
}

function wireOrigin(item: FeedItem): string | null {
  const text = `${item.title}\n${item.description || ''}`;
  const patterns: Array<[string, RegExp[]]> = [
    ['reuters', [
      /^\s*(?:by\s+)?reuters(?:\s*[—–:-]|\s*\()/im,
      /^\s*[A-Z][A-Z .'-]+\s+\(Reuters\)\s*[—–-]/m,
      /\bcopyright\s+(?:\d{4}\s+)?reuters\b/i,
    ]],
    ['associated-press', [
      /^\s*(?:by\s+)?(?:the\s+)?associated press(?:\s*[—–:-]|\s*\()/im,
      /^\s*\(?AP\)?\s*[—–:-]\s+/m,
      /\bcopyright\s+(?:\d{4}\s+)?(?:the\s+)?associated press\b/i,
    ]],
    ['afp', [
      /^\s*(?:by\s+)?(?:afp|agence france-presse)(?:\s*[—–:-]|\s*\()/im,
      /\bcopyright\s+(?:\d{4}\s+)?(?:afp|agence france-presse)\b/i,
    ]],
  ];

  return patterns.find(([, candidates]) => candidates.some(pattern => pattern.test(text)))?.[0] || null;
}

function likelySyndicated(left: Document, right: Document): boolean {
  if (left.canonicalLink === right.canonicalLink) return true;

  if (
    left.normalizedTitle.length > 0
    && left.normalizedTitle === right.normalizedTitle
  ) {
    return true;
  }

  const titleContainment = setContainment(left.titleTokenSet, right.titleTokenSet);
  const descriptionContainment = setContainment(
    left.descriptionShingles,
    right.descriptionShingles
  );
  const hasUsefulDescriptions = Math.min(
    left.descriptionShingles.size,
    right.descriptionShingles.size
  ) >= 4;

  if (
    hasUsefulDescriptions
    && descriptionContainment >= 0.82
    && titleContainment >= 0.55
  ) {
    return true;
  }

  if (
    hasUsefulDescriptions
    && titleContainment >= 0.9
    && descriptionContainment >= 0.55
  ) {
    return true;
  }

  return Boolean(
    left.syndicationOrigin
    && left.syndicationOrigin === right.syndicationOrigin
    && titleContainment >= 0.68
  );
}

function groupIndependentReports(documents: Document[]): Document[][] {
  const groups: Document[][] = [];
  documents.forEach(document => {
    const matchingGroup = groups.find(group =>
      group.some(candidate => likelySyndicated(document, candidate))
    );
    if (matchingGroup) {
      matchingGroup.push(document);
    } else {
      groups.push([document]);
    }
  });
  return groups;
}

function independentReportCount(cluster: WorkingCluster, groups = groupIndependentReports(cluster.documents)): number {
  const publisherCount = new Set(
    cluster.documents.map(document => document.item.source)
  ).size;
  return Math.min(groups.length, publisherCount);
}

function termFeatures(tokens: string[]): string[] {
  const features = [...tokens.map(token => `u:${token}`)];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    features.push(`b:${tokens[index]}_${tokens[index + 1]}`);
  }
  return features;
}

function normalizeVector(vector: SparseVector): SparseVector {
  const magnitude = Math.sqrt([...vector.values()].reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return new Map([...vector].map(([term, value]) => [term, value / magnitude]));
}

function cosine(left: SparseVector, right: SparseVector): number {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let dotProduct = 0;
  smaller.forEach((value, term) => {
    dotProduct += value * (larger.get(term) || 0);
  });
  return dotProduct;
}

function meanVector(documents: Document[]): SparseVector {
  const vector = new Map<string, number>();
  documents.forEach(document => {
    document.vector.forEach((value, term) => {
      vector.set(term, (vector.get(term) || 0) + value / documents.length);
    });
  });
  return normalizeVector(vector);
}

function sharedUnigrams(tokens: string[], centroid: SparseVector): number {
  return new Set(tokens.filter(token => centroid.has(`u:${token}`))).size;
}

function clusterDocuments(documents: Document[]): WorkingCluster[] {
  const clusters: WorkingCluster[] = [];

  documents.forEach(document => {
    let bestCluster: WorkingCluster | null = null;
    let bestSimilarity = 0;

    for (const cluster of clusters) {
      const similarity = cosine(document.vector, cluster.centroid);
      const overlap = sharedUnigrams(document.tokens, cluster.centroid);
      if (similarity >= CLUSTER_SIMILARITY && overlap >= 2 && similarity > bestSimilarity) {
        bestCluster = cluster;
        bestSimilarity = similarity;
      }
    }

    if (bestCluster) {
      bestCluster.documents.push(document);
      bestCluster.centroid = meanVector(bestCluster.documents);
    } else {
      clusters.push({ documents: [document], centroid: document.vector });
    }
  });

  return clusters;
}

function representativeFor(cluster: WorkingCluster, now: number): Document {
  return [...cluster.documents].sort((left, right) => {
    const centrality = (document: Document) =>
      cluster.documents.reduce((sum, other) => sum + cosine(document.vector, other.vector), 0)
      + (document.item.sourceType === 'news' ? 0.15 : 0)
      + Math.max(0, 1 - ((now - document.timestamp) / (24 * 60 * 60 * 1000))) * 0.1;
    return centrality(right) - centrality(left);
  })[0];
}

function clusterScore(cluster: WorkingCluster, now: number, independentReports: number): number {
  const sources = new Set(cluster.documents.map(document => document.item.source));
  const sourceTypes = new Set(cluster.documents.map(document => document.item.sourceType));
  const newest = Math.max(...cluster.documents.map(document => document.timestamp));
  const ageHours = Math.max(0, (now - newest) / (60 * 60 * 1000));
  const recency = Math.exp(-ageHours / 18);
  const engagement = cluster.documents.reduce(
    (sum, document) => sum + Math.log1p(document.item.score || 0),
    0
  ) / Math.max(1, cluster.documents.length);

  return (
    Math.min(independentReports, 6) * 3
    + Math.log2(Math.min(independentReports, sources.size + 1) + 1) * 1.5
    + recency * 2
    + Math.max(0, sourceTypes.size - 1) * 0.5
    + Math.min(engagement / 8, 0.75)
  );
}

function topKeywords(cluster: WorkingCluster): string[] {
  const stems = [...cluster.centroid]
    .filter(([term]) => term.startsWith('u:'))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([term]) => term.slice(2));

  return stems.map(keywordStem => {
    for (const document of cluster.documents) {
      const rawTokens = document.item.title.toLocaleLowerCase()
        .match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [];
      const match = rawTokens.find(token => stem(token) === keywordStem);
      if (match) return match;
    }
    return keywordStem;
  });
}

function coverageLabel(
  independentReports: number,
  itemCount: number,
  hasSyndication: boolean
): BriefingCluster['coverage'] {
  if (independentReports >= 4) return 'broad coverage';
  if (independentReports >= 2) return 'multi-source';
  if (hasSyndication) return 'syndicated';
  if (itemCount >= 2) return 'developing';
  return 'single report';
}

function uniqueRecentItems(items: FeedItem[], now: number, windowHours: number, maxItems: number): FeedItem[] {
  const oldestAllowed = now - windowHours * 60 * 60 * 1000;
  const seenSourceTitles = new Set<string>();
  const seenSourceLinks = new Set<string>();

  return [...items]
    .filter(item => {
      const timestamp = new Date(item.timestamp).getTime();
      return item.title.trim().length > 0
        && item.link.trim().length > 0
        && Number.isFinite(timestamp)
        && timestamp <= now + 15 * 60 * 1000
        && timestamp >= oldestAllowed;
    })
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .filter(item => {
      const source = item.source.toLocaleLowerCase();
      const titleKey = `${source}\u0000${normalizedText(item.title)}`;
      const linkKey = `${source}\u0000${canonicalLink(item.link)}`;
      if (seenSourceTitles.has(titleKey) || seenSourceLinks.has(linkKey)) return false;
      seenSourceTitles.add(titleKey);
      seenSourceLinks.add(linkKey);
      return true;
    })
    .slice(0, maxItems);
}

export function buildNowBriefing(items: FeedItem[], options: BriefingOptions = {}): NowBriefing {
  const now = options.now ?? Date.now();
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxClusters = options.maxClusters ?? DEFAULT_MAX_CLUSTERS;
  const currentItems = uniqueRecentItems(items, now, windowHours, maxItems);

  const tokenized = currentItems.map(item => ({ item, tokens: tokenize(item.title) }));
  const documentFrequency = new Map<string, number>();
  tokenized.forEach(({ tokens }) => {
    new Set(termFeatures(tokens)).forEach(term => {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    });
  });

  const documents: Document[] = tokenized
    .filter(({ tokens }) => tokens.length > 0)
    .map(({ item, tokens }) => {
      const featureCounts = new Map<string, number>();
      termFeatures(tokens).forEach(term => {
        featureCounts.set(term, (featureCounts.get(term) || 0) + 1);
      });

      const vector = new Map<string, number>();
      featureCounts.forEach((count, term) => {
        const inverseDocumentFrequency = Math.log(
          (tokenized.length + 1) / ((documentFrequency.get(term) || 0) + 1)
        ) + 1;
        const bigramBoost = term.startsWith('b:') ? 1.2 : 1;
        vector.set(term, (1 + Math.log(count)) * inverseDocumentFrequency * bigramBoost);
      });

      return {
        item,
        tokens,
        timestamp: new Date(item.timestamp).getTime(),
        vector: normalizeVector(vector),
        canonicalLink: canonicalLink(item.link),
        normalizedTitle: normalizedText(item.title),
        titleTokenSet: new Set(tokens),
        descriptionShingles: wordShingles(item.description || ''),
        syndicationOrigin: wireOrigin(item),
      };
    });

  const ranked: BriefingCluster[] = clusterDocuments(documents)
    .map(cluster => {
      const reportGroups = groupIndependentReports(cluster.documents);
      const independentReports = independentReportCount(cluster, reportGroups);
      return {
        cluster,
        reportGroups,
        independentReports,
        score: clusterScore(cluster, now, independentReports),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, maxClusters)
    .map(({ cluster, reportGroups, independentReports, score }) => {
      const representative = representativeFor(cluster, now);
      const sources = [...new Set(cluster.documents.map(document => document.item.source))];
      const sourceTypes = [...new Set(cluster.documents.map(document => document.item.sourceType))];
      const supporting = reportGroups
        .filter(group => !group.some(document => document.item.id === representative.item.id))
        .map(group => [...group].sort((left, right) => right.timestamp - left.timestamp)[0])
        .sort((left, right) => right.timestamp - left.timestamp)
        .filter((document, index, all) =>
          all.findIndex(candidate => candidate.item.source === document.item.source) === index
        )
        .slice(0, 2)
        .map(document => ({
          id: document.item.id,
          headline: document.item.title,
          link: document.item.link,
          source: document.item.source,
        }));

      return {
        id: `briefing-${representative.item.id}`,
        headline: representative.item.title,
        link: representative.item.link,
        timestamp: representative.item.timestamp,
        sources,
        sourceTypes,
        keywords: topKeywords(cluster),
        supporting,
        itemCount: cluster.documents.length,
        independentReportCount: independentReports,
        publisherCount: sources.length,
        coverage: coverageLabel(
          independentReports,
          cluster.documents.length,
          reportGroups.length < cluster.documents.length
        ),
        score: Number(score.toFixed(3)),
      };
    });

  // A heavily concentrated news cycle can collapse into fewer than the requested
  // number of clusters. Fill the remaining briefing cells with the newest distinct
  // reports so every filter page uses the complete six-cell layout without
  // inventing text or links.
  const selectedLinks = new Set(ranked.map(cluster => cluster.link));
  const selectedDocuments = documents.filter(document => selectedLinks.has(document.item.link));
  const fallbackDocuments = [...documents].sort((left, right) => right.timestamp - left.timestamp);
  for (const document of fallbackDocuments) {
    if (ranked.length >= maxClusters) break;
    if (selectedLinks.has(document.item.link)) continue;
    if (selectedDocuments.some(selected => likelySyndicated(document, selected))) continue;
    selectedLinks.add(document.item.link);
    selectedDocuments.push(document);
    ranked.push({
      id: `briefing-fallback-${document.item.id}`,
      headline: document.item.title,
      link: document.item.link,
      timestamp: document.item.timestamp,
      sources: [document.item.source],
      sourceTypes: [document.item.sourceType],
      keywords: document.tokens.slice(0, 3),
      supporting: [],
      itemCount: 1,
      independentReportCount: 1,
      publisherCount: 1,
      coverage: 'single report',
      score: 0,
    });
  }

  return {
    generatedAt: new Date(now).toISOString(),
    analyzedCount: documents.length,
    windowHours,
    clusters: ranked,
  };
}

export function findRelatedFeedItems(
  target: FeedItem,
  items: FeedItem[],
  limit = 5
): RelatedFeedItem[] {
  const targetTokens = new Set(tokenize(target.title));
  const targetBigrams = new Set(
    termFeatures([...targetTokens]).filter(feature => feature.startsWith('b:'))
  );
  const targetTimestamp = new Date(target.timestamp).getTime();
  if (targetTokens.size < 2 || !Number.isFinite(targetTimestamp)) return [];

  return items
    .filter(candidate =>
      candidate.id !== target.id
      && candidate.link !== target.link
      && candidate.source !== target.source
      && candidate.link.length > 0
    )
    .map(candidate => {
      const candidateTokens = new Set(tokenize(candidate.title));
      const sharedTerms = [...targetTokens].filter(token => candidateTokens.has(token));
      const candidateBigrams = new Set(
        termFeatures([...candidateTokens]).filter(feature => feature.startsWith('b:'))
      );
      const sharedBigrams = [...targetBigrams].filter(bigram => candidateBigrams.has(bigram)).length;
      const smallerSize = Math.min(targetTokens.size, candidateTokens.size);
      const containment = smallerSize > 0 ? sharedTerms.length / smallerSize : 0;
      const targetCoverage = sharedTerms.length / targetTokens.size;
      const timestamp = new Date(candidate.timestamp).getTime();
      const hoursApart = Number.isFinite(timestamp)
        ? Math.abs(timestamp - targetTimestamp) / (60 * 60 * 1000)
        : Number.POSITIVE_INFINITY;
      const temporalFit = Math.exp(-hoursApart / 24);

      const similarity = (
        containment * 0.62
        + targetCoverage * 0.2
        + Math.min(sharedBigrams, 2) * 0.08
        + temporalFit * 0.02
      );
      const isStrongMatch = sharedTerms.length >= 2
        && (containment >= 0.38 || sharedBigrams >= 1)
        && hoursApart <= 48;

      return {
        item: candidate,
        similarity: isStrongMatch ? similarity : 0,
        sharedTerms,
      };
    })
    .filter(result => result.similarity >= 0.34)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)
    .map(result => ({
      ...result,
      similarity: Number(result.similarity.toFixed(3)),
    }));
}
