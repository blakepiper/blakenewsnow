export interface FeedItem {
  id: string;
  title: string;
  source: string;
  sourceType: 'news' | 'tech' | 'science' | 'social' | 'local';
  category: string;
  timestamp: string;
  link: string;
  score?: number;
  comments?: number;
  community?: string;
  domain?: string;
  description?: string;
  isNew?: boolean;
}

export type MobileView = 'feed' | 'markets' | 'weather' | 'more';
