import { useState, useEffect } from 'react';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketsResponse {
  indices: MarketData[];
  movers: MarketData[];
}

function formatPrice(price: number): string {
  if (price >= 10000) return (price / 1000).toFixed(1) + 'k';
  if (price >= 1000) return price.toFixed(0);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

export function Financial() {
  const [indices, setIndices] = useState<MarketData[]>([]);
  const [crypto, setCrypto] = useState<MarketData[]>([]);
  const [movers, setMovers] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch(`${API_BASE}/api/markets`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: MarketsResponse = await res.json();
        setIndices(data.indices || []);
        setMovers(data.movers || []);
      } catch (err) {
        console.error('Markets fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
    const interval = setInterval(fetchMarkets, REFRESH_INTERVALS.markets);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchCrypto() {
      try {
        const res = await fetch(`${API_BASE}/api/crypto`);
        if (!res.ok) throw new Error('Failed to fetch');
        setCrypto(await res.json());
      } catch (err) {
        console.error('Crypto fetch error:', err);
      }
    }
    fetchCrypto();
    const interval = setInterval(fetchCrypto, REFRESH_INTERVALS.crypto);
    return () => clearInterval(interval);
  }, []);

  const allItems = [...indices, ...crypto.slice(0, 3), ...movers.slice(0, 2)];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-2 py-0.5 border-b border-white/10 flex items-center">
        <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Markets</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-0.5">
        {loading ? (
          <div className="text-white/40 text-xs">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0">
            {allItems.map((item) => {
              const isPositive = item.change >= 0;
              return (
                <div key={item.symbol} className="flex items-center justify-between text-[10px] leading-tight py-px">
                  <span className="text-white/80 font-medium">{item.symbol}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white/60 tabular-nums">{formatPrice(item.price)}</span>
                    <span className={`tabular-nums font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
