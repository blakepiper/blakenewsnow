import { useState, useEffect, useCallback } from 'react';
import { API_BASE, REFRESH_INTERVALS, ANIMATION_INTERVALS } from '../config';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number | null;
  windSpeed: number | null;
  location: string;
  high: number;
  low: number;
  feelsLike: number;
  lat: number;
  lon: number;
  forecast: ForecastDay[];
}

interface ForecastDay {
  day: string;
  high: number;
  low: number | null;
  condition: string;
  icon: string;
}

interface RadarData {
  host: string;
  frames: { time: number; path: string; isNowcast?: boolean }[];
}

function mapConditionToIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear') || c.includes('fair')) return '☀️';
  if (c.includes('rain') || c.includes('shower') || c.includes('thunder')) return '🌧️';
  if (c.includes('snow') || c.includes('flurr') || c.includes('blizzard')) return '❄️';
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog')) return '☁️';
  return '⛅';
}

interface WeatherProps {
  zip?: string;
}

export function Weather({ zip = '22314' }: WeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [radar, setRadar] = useState<RadarData | null>(null);
  const [radarFrame, setRadarFrame] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), ANIMATION_INTERVALS.clock);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/weather?zip=${zip}`);
        if (res.ok) setWeather(await res.json());
      } catch (e) { console.error('Weather error:', e); }
    }
    load();
    const interval = setInterval(load, REFRESH_INTERVALS.weather);
    return () => clearInterval(interval);
  }, [zip]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/radar`);
        if (res.ok) setRadar(await res.json());
      } catch (e) { console.error('Radar error:', e); }
    }
    load();
    const interval = setInterval(load, REFRESH_INTERVALS.radar);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!radar || radar.frames.length === 0 || !radarPlaying) return;
    const interval = setInterval(() => {
      setRadarFrame(prev => (prev + 1) % radar.frames.length);
    }, ANIMATION_INTERVALS.radarFrame);
    return () => clearInterval(interval);
  }, [radar, radarPlaying]);

  const toggleRadar = useCallback(() => {
    setRadarPlaying(prev => !prev);
  }, []);

  const getTileCoords = () => {
    if (!weather) return null;
    const zoom = 6;
    const x = Math.floor((weather.lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(weather.lat * Math.PI / 180) + 1 / Math.cos(weather.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { zoom, x, y };
  };

  const getRadarUrl = () => {
    if (!radar || !weather || radar.frames.length === 0) return null;
    const coords = getTileCoords();
    if (!coords) return null;
    const frame = radar.frames[radarFrame];
    const tileUrl = `${radar.host}${frame.path}/256/${coords.zoom}/${coords.x}/${coords.y}/2/1_1.png`;
    return `${API_BASE}/api/radar/tile?url=${encodeURIComponent(tileUrl)}`;
  };

  const getMapUrl = () => {
    const coords = getTileCoords();
    if (!coords) return null;
    return `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${coords.zoom}/${coords.x}/${coords.y}.png`;
  };

  if (!weather) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-xs">
        Loading...
      </div>
    );
  }

  const radarUrl = getRadarUrl();
  const mapUrl = getMapUrl();

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left: Current conditions */}
      <div className="flex-1 flex flex-col px-3 py-2 md:px-2 md:py-1 min-w-0">
        {/* Top row: Temp + condition + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-lg">{mapConditionToIcon(weather.condition)}</span>
            <span className="text-white text-3xl md:text-xl font-light tabular-nums">{weather.temperature}°</span>
          </div>
          <div className="text-right">
            <div className="text-white text-lg md:text-sm font-medium tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-white/50 text-xs md:text-[10px]">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Condition text */}
        <div className="text-white/70 text-sm md:text-[10px] mt-0.5">{weather.condition}</div>

        {/* Location + details */}
        <div className="flex items-center gap-3 text-xs md:text-[10px] text-white/60 mt-1">
          <span className="truncate">{weather.location}</span>
          {weather.humidity != null && <span>{weather.humidity}%</span>}
          {weather.windSpeed != null && <span>{weather.windSpeed}mph</span>}
          <span>H:{weather.high}° L:{weather.low}°</span>
        </div>

        {/* Forecast */}
        <div className="flex-1 flex items-end mt-2 md:mt-0">
          <div className="flex gap-3 md:gap-2 w-full">
            {weather.forecast.slice(0, 5).map((day) => (
              <div key={day.day} className="flex flex-col items-center text-xs md:text-[9px]">
                <span className="text-white/50">{day.day}</span>
                <span className="text-base md:text-sm">{mapConditionToIcon(day.condition)}</span>
                <span className="text-white/80 tabular-nums">{day.high}°</span>
                {day.low != null && (
                  <span className="text-white/40 tabular-nums">{day.low}°</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Radar */}
      <div
        className="w-full h-40 md:w-28 md:h-full relative bg-black shrink-0 overflow-hidden cursor-pointer"
        onClick={toggleRadar}
      >
        {mapUrl && (
          <img
            src={mapUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        {radarUrl && (
          <>
            <img
              src={radarUrl}
              alt="Weather radar"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full border border-white/50" />
            </div>
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[8px] text-white/50 bg-black/60 px-1">
          <span>RADAR</span>
          <span>{radarPlaying ? '▶' : '⏸'}</span>
        </div>
      </div>
    </div>
  );
}
