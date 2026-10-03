import type { FeedItem } from '../types.ts';
import { financeTopics, isFinanceEntry } from '../../shared/source-policy.js';

export type FinanceTopic = 'all' | 'stocks' | 'ipos' | 'crypto' | 'trade' | 'macro';

export function getFinanceTopics(item: Pick<FeedItem, 'title' | 'description' | 'source'>): Exclude<FinanceTopic, 'all'>[] {
  return financeTopics(item) as Exclude<FinanceTopic, 'all'>[];
}

export function matchesFinanceFilter(item: FeedItem, topic: FinanceTopic = 'all'): boolean {
  if (!['news', 'tech', 'finance'].includes(item.sourceType)) return false;
  return topic === 'all' ? isFinanceEntry(item) : getFinanceTopics(item).includes(topic);
}
