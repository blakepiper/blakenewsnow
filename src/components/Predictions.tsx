import { useState, useEffect } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface Prediction {
  id: string;
  question: string;
  yesPrice: number;
  volume24h: number;
  volumeDisplay: string;
  category: string;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    politics: 'text-blue-400',
    finance: 'text-green-400',
    world: 'text-red-400',
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-0.5 border-b border-white/10 flex items-center">
        <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Predictions</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-0.5">
        {error ? (
          <div className="text-white/40 text-xs">{error}</div>
        ) : (
          <div className="space-y-0">
            {predictions.slice(0, 6).map((pred) => (
              <div key={pred.id} className="flex items-center gap-1 text-[10px] leading-tight py-px">
                <span className={`${getCategoryColor(pred.category)} shrink-0 w-5 uppercase font-medium`}>
                  {pred.category.substring(0, 3)}
                </span>
                <span className="text-white/80 truncate flex-1">{pred.question}</span>
                <span className={`shrink-0 font-medium tabular-nums ${
                  pred.yesPrice >= 50 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {pred.yesPrice}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
