interface Article {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  link?: string;
  description?: string;
  content?: string;
}

interface ArticleReaderProps {
  article: Article | null;
  onClose: () => void;
  onSaveToReadingList?: (articleId: string) => void;
  isInReadingList?: boolean;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'NPR': 'bg-blue-500',
    'BBC': 'bg-amber-500',
    'Guardian': 'bg-indigo-500',
    'Al Jazeera': 'bg-orange-500',
    'ABC News': 'bg-yellow-500',
    'CBS News': 'bg-cyan-500',
    'NY Times': 'bg-slate-400',
    'Reuters': 'bg-orange-600',
    'Associated Press': 'bg-red-500',
    'Hacker News': 'bg-orange-400',
    'Ars Technica': 'bg-orange-500',
    'The Verge': 'bg-purple-500',
    'TechCrunch': 'bg-green-500',
    'Wired': 'bg-black',
    'Lobsters': 'bg-red-600',
    'Reddit': 'bg-orange-600',
  };
  return colors[source] || 'bg-gray-500';
}

export function ArticleReader({ article, onClose, onSaveToReadingList, isInReadingList }: ArticleReaderProps) {
  if (!article) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-[#111] border-l border-white/10 overflow-hidden animate-slide-in flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${getSourceColor(article.source)}`} />
            <span className="text-white/70 text-sm font-medium">{article.source}</span>
          </div>
          <div className="flex items-center gap-2">
            {onSaveToReadingList && (
              <button
                onClick={() => onSaveToReadingList(article.id)}
                className={`p-2 rounded transition-colors ${
                  isInReadingList
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title={isInReadingList ? 'Remove from reading list' : 'Save to reading list'}
              >
                <svg className="w-5 h-5" fill={isInReadingList ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-2 rounded hover:bg-white/10 transition-colors"
              aria-label="Close article reader"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h1 className="text-white text-xl font-medium leading-tight mb-3">
            {article.title}
          </h1>

          <div className="text-white/50 text-sm mb-6">
            {formatDate(article.timestamp)}
          </div>

          {article.description && (
            <div className="text-white/70 text-base leading-relaxed mb-6">
              {article.description}
            </div>
          )}

          {article.content && (
            <div className="text-white/80 text-base leading-relaxed prose prose-invert max-w-none">
              {article.content}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 shrink-0">
          {article.link ? (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
            >
              <span>Read full article</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <div className="text-white/40 text-sm text-center">
              No external link available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
