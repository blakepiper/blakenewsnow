import { usePollingQuery } from '../hooks/usePollingQuery';
import { API_BASE, REFRESH_INTERVALS } from '../config';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  quoteSymbol?: string;
  asOf?: string | null;
  fetchedAt?: string;
  currency?: string;
}

interface MarketsResponse {
  indices: MarketData[];
  movers: MarketData[];
}

interface MacroData {
  id: string;
  name: string;
  unit: string;
  value: number;
  previousValue: number | null;
  change: number | null;
  date: string;
  url: string;
  source: string;
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
      title={`${item.name} · ${item.currency || 'USD'}${item.asOf ? `\nQuote: ${new Date(item.asOf).toLocaleString()}` : '\nQuote time unavailable'}${item.fetchedAt ? `\nRetrieved: ${new Date(item.fetchedAt).toLocaleString()}` : ''}`}
      className="flex items-center justify-between text-[11px] md:text-[10px] leading-tight py-1.5 md:py-1 px-1 -mx-1 rounded hover:bg-white/5 active:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white/90 font-medium shrink-0">{item.symbol}</span>
        <div className="min-w-0 text-white/40"><span className="block truncate">{item.name}</span><span className="block text-[9px]">{item.asOf ? new Date(item.asOf).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Quote time unavailable'}</span></div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-white/60 tabular-nums">{formatPrice(item.price)}</span>
        <span className={`tabular-nums font-medium min-w-[48px] text-right ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%
        </span>
      </div>
    </Tag>
  );
}

function MacroItem({ item }: { item: MacroData }) {
  const change = item.change;
  const changeColor = change == null || change === 0
    ? 'text-white/50'
    : change > 0 ? 'text-amber-400' : 'text-green-400';
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${item.name} · ${item.unit}\nObservation: ${item.date}\nChange since previous observation: ${item.change ?? 'unavailable'} ${item.unit}`}
      className="flex items-center justify-between text-[11px] md:text-[10px] leading-tight py-1.5 md:py-1 px-1 -mx-1 rounded hover:bg-white/5 transition-colors"
    >
      <span className="text-white/70 truncate">{item.name}<span className="block text-white/40 text-[9px]">{item.date}</span></span>
      <span className="flex items-center gap-2 shrink-0 ml-2 tabular-nums">
        <span className="text-white/80">{item.value.toFixed(item.unit === 'index' ? 1 : 2)}{item.unit === '%' ? '%' : <span className="text-white/40 text-[9px]"> {item.unit}</span>}</span>
        {change != null && <span className={changeColor}>{change > 0 ? '+' : ''}{change.toFixed(2)}</span>}
      </span>
    </a>
  );
}

export function Financial() {
  const markets = usePollingQuery<MarketsResponse>(`${API_BASE}/api/markets`, REFRESH_INTERVALS.markets);
  const cryptoQuery = usePollingQuery<MarketData[]>(`${API_BASE}/api/crypto`, REFRESH_INTERVALS.crypto);
  const macroQuery = usePollingQuery<MacroData[]>(`${API_BASE}/api/macro`, 5 * 60 * 1000);
  const indices = markets.data?.indices || [];
  const movers = markets.data?.movers || [];
  const crypto = cryptoQuery.data || [];
  const macro = macroQuery.data || [];
  const loading = markets.loading;

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-1 md:px-2 md:py-0.5 min-h-0">
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
                    href={`https://finance.yahoo.com/quote/${encodeURIComponent(item.quoteSymbol || item.symbol)}`}
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
                <div className="text-[10px] font-medium uppercase tracking-wide text-white/40 mb-0.5">Watchlist movement</div>
                {movers.map((item) => (
                  <MarketItem
                    key={item.symbol}
                    item={item}
                    href={`https://finance.yahoo.com/quote/${item.symbol}`}
                  />
                ))}
              </div>
            )}

            {macro.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-white/40 mb-0.5">Macro · FRED</div>
                {macro.map(item => <MacroItem key={item.id} item={item} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
