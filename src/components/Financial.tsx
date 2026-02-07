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

function MarketItem({ item, href }: { item: MarketData; href?: string }) {
  const isPositive = item.change >= 0;
  const Tag = href ? 'a' : 'div';

  return (
    <Tag
      {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="flex items-center justify-between text-[11px] md:text-[10px] leading-tight py-1.5 md:py-0.5 px-1 -mx-1 rounded hover:bg-white/5 active:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-white/90 font-medium">{item.symbol}</span>
        <span className="text-white/40 hidden md:inline">{item.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/60 tabular-nums">{formatPrice(item.price)}</span>
        <span className={`tabular-nums font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%
        </span>
      </div>
    </Tag>
  );
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-1 md:px-2 md:py-0.5">
        {loading ? (
          <div className="text-white/40 text-xs py-2">Loading...</div>
        ) : (
          <div className="space-y-2 md:space-y-1">
            {/* Indices */}
            {indices.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-white/40 mb-0.5">Indices</div>
                {indices.map((item) => (
                  <MarketItem
                    key={item.symbol}
                    item={item}
                    href={`https://finance.yahoo.com/quote/${encodeURIComponent(item.symbol === 'SPX' ? '^GSPC' : item.symbol === 'DJI' ? '^DJI' : item.symbol === 'IXIC' ? '^IXIC' : '^' + item.symbol)}`}
                  />
                ))}
              </div>
            )}

            {/* Crypto */}
            {crypto.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-white/40 mb-0.5">Crypto</div>
                {crypto.map((item) => (
                  <MarketItem
                    key={item.symbol}
                    item={item}
                    href={`https://www.coingecko.com/en/coins/${item.name.toLowerCase()}`}
                  />
                ))}
              </div>
            )}

            {/* Movers */}
            {movers.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-white/40 mb-0.5">Movers</div>
                {movers.map((item) => (
                  <MarketItem
                    key={item.symbol}
                    item={item}
                    href={`https://finance.yahoo.com/quote/${item.symbol}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
