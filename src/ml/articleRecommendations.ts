import type { FeedItem } from '../types';
import { findRelatedFeedItems } from './nowBriefing.ts';

export interface ArticlePreviewDocument {
  title: string;
  byline: string;
  siteName: string;
  excerpt: string;
  publishedTime: string;
  length: number;
  paragraphs: string[];
  requestedUrl: string;
  finalUrl: string;
  cached: boolean;
  extractionMode: 'article' | 'metadata';
}

export interface ReadableArticleRecommendation {
  item: FeedItem;
  preview: ArticlePreviewDocument;
  similarity: number;
  sharedTerms: string[];
}

type PreviewLoader = (item: FeedItem) => Promise<ArticlePreviewDocument>;

/**
 * Ranks same-event reporting locally, then verifies the strongest candidates
 * through the text reader. A recommendation is returned only when its source
 * has already produced a complete readable article.
 */
export async function findReadableArticleRecommendation(
  target: FeedItem,
  alternatives: FeedItem[],
  loadPreview: PreviewLoader,
  limit = 4
): Promise<ReadableArticleRecommendation | null> {
  const related = findRelatedFeedItems(target, alternatives, limit);
  if (related.length === 0) return null;

  const verified = await Promise.allSettled(
    related.map(async match => ({
      ...match,
      preview: await loadPreview(match.item),
    }))
  );

  for (const result of verified) {
    if (
      result.status === 'fulfilled'
      && result.value.preview.extractionMode === 'article'
    ) {
      return result.value;
    }
  }

  return null;
}
