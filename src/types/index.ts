export interface Headline {
  id: string;
  title: string;
  source: string;
  timestamp: Date;
  url?: string;
  category?: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  location: string;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export interface FinancialData {
  indices: StockData[];
  crypto: CryptoData[];
  movers: {
    gainers: StockData[];
    losers: StockData[];
  };
  lastUpdated: Date;
}

export interface TickerItem {
  id: string;
  text: string;
  source: string;
  category?: 'breaking' | 'markets' | 'trending' | 'general';
}
