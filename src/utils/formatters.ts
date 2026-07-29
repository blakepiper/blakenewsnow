export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function formatScore(score: number): string {
  if (score >= 10000) return (score / 1000).toFixed(0) + 'k';
  if (score >= 1000) return (score / 1000).toFixed(1) + 'k';
  return score.toString();
}

export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'NPR': 'bg-blue-500',
    'BBC': 'bg-amber-500',
    'CBC News': 'bg-red-600',
    'DW': 'bg-blue-700',
    'Guardian': 'bg-indigo-500',
    'Al Jazeera': 'bg-orange-500',
    'ABC News': 'bg-yellow-500',
    'CBS News': 'bg-cyan-500',
    'NY Times': 'bg-slate-400',
    'Google Trends': 'bg-green-500',
    'PBS NewsHour': 'bg-indigo-600',
    'NBC News': 'bg-blue-600',
    'Axios': 'bg-sky-600',
    'The Hill': 'bg-cyan-700',
    'Vox': 'bg-rose-600',
    'Hacker News': 'bg-orange-400',
    'Ars Technica': 'bg-orange-500',
    'The Verge': 'bg-purple-500',
    'TechCrunch': 'bg-green-500',
    'Wired': 'bg-gray-600',
    'Lobsters': 'bg-red-600',
    'MIT Technology Review': 'bg-red-700',
    'BleepingComputer': 'bg-sky-700',
    'Rest of World': 'bg-lime-700',
    'The Register': 'bg-rose-700',
    '404 Media': 'bg-violet-700',
    'Fox News': 'bg-blue-700',
    'Politico': 'bg-red-500',
    'Semafor': 'bg-amber-600',
    'The Intercept': 'bg-green-600',
    'ProPublica': 'bg-yellow-600',
    'Foreign Policy': 'bg-teal-600',
    'Breitbart': 'bg-orange-700',
    '/news/': 'bg-green-700',
    '/pol/': 'bg-amber-700',
    '/lit/': 'bg-fuchsia-700',
  };
  if (source.startsWith('c/')) return 'bg-emerald-600';
  return colors[source] || 'bg-gray-500';
}

export function getSourceCategory(source: string): 'news' | 'tech' | 'social' {
  const techSources = [
    'Hacker News',
    'Ars Technica',
    'The Verge',
    'TechCrunch',
    'Wired',
    'Lobsters',
    'MIT Technology Review',
    'BleepingComputer',
    'Rest of World',
    'The Register',
    '404 Media',
  ];
  if (techSources.includes(source)) return 'tech';
  if (source.startsWith('c/')) return 'social';
  if (source.startsWith('/') && source.endsWith('/')) return 'social';
  return 'news';
}

export function getCategoryDotColor(sourceType: 'news' | 'tech' | 'social'): string {
  switch (sourceType) {
    case 'news': return 'bg-blue-400';
    case 'tech': return 'bg-purple-400';
    case 'social': return 'bg-orange-400';
  }
}

export function getDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '').slice(0, 15);
  } catch {
    return '';
  }
}
