export interface FeedItem {
  id: string;
  title: string;
  source: string;
  sourceType: 'news' | 'tech' | 'social';
  category: string;
  timestamp: string;
  link: string;
  score?: number;
  comments?: number;
  subreddit?: string;
  domain?: string;
  isNew?: boolean;
}

export type MobileView = 'feed' | 'markets' | 'weather' | 'more';
