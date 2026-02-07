import { useState, useEffect } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface Prediction {
  id: string;
  question: string;
  yesPrice: number;
  volume24h: number;
  volumeDisplay: string;
  category: string;
  slug?: string;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    politics: 'text-blue-400',
    finance: 'text-green-400',
    world: 'text-red-400',
    geopolitical: 'text-orange-400',
    general: 'text-purple-400',
  };
  return colors[category] || 'text-white/50';
}

export function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const res = await fetch(`${API_BASE}/api/predictions`);
        if (!res.ok) throw new Error('Failed to fetch');
        setPredictions(await res.json());
        setError(null);
      } catch (err) {
        console.error('Predictions fetch error:', err);
        setError('Unable to load');
      }
    }
    fetchPredictions();
    const interval = setInterval(fetchPredictions, REFRESH_INTERVALS.predictions);
    return () => clearInterval(interval);
  }, []);

  // Group by category
  const byCategory = predictions.reduce((acc, pred) => {
    if (!acc[pred.category]) acc[pred.category] = [];
    acc[pred.category].push(pred);
    return acc;
  }, {} as Record<string, Prediction[]>);

  const categoryLabels: Record<string, string> = {
    politics: 'Politics',
    finance: 'Finance',
    world: 'World',
    geopolitical: 'Geopolitical',
    general: 'General',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-1 md:px-2 md:py-0.5 min-h-0">
        {error ? (
          <div className="text-white/40 text-xs py-2">{error}</div>
        ) : predictions.length === 0 ? (
          <div className="text-white/40 text-xs py-2">Loading predictions...</div>
        ) : (
          <div className="space-y-2 md:space-y-1">
            {Object.entries(byCategory).map(([category, preds]) => (
              <div key={category}>
                <div className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${getCategoryColor(category)}`}>
                  {categoryLabels[category] || category}
                </div>
                {preds.map((pred) => (
                  <a
                    key={pred.id}
                    href={pred.slug ? `https://polymarket.com/event/${pred.slug}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-1.5 md:py-1 hover:bg-white/5 active:bg-white/10 rounded px-1 -mx-1 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[11px] md:text-[10px] leading-tight">
                      <span className="text-white/80 flex-1 line-clamp-2 md:line-clamp-1">{pred.question}</span>
                      <span className={`shrink-0 font-bold tabular-nums text-xs ${
                        pred.yesPrice >= 50 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {pred.yesPrice}%
                      </span>
                    </div>
                    {/* Visual bar + volume */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pred.yesPrice >= 50 ? 'bg-green-500/60' : 'bg-red-500/60'
                          }`}
                          style={{ width: `${pred.yesPrice}%` }}
                        />
                      </div>
                      <span className="text-white/30 text-[9px] tabular-nums shrink-0">{pred.volumeDisplay}</span>
                    </div>
                  </a>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
