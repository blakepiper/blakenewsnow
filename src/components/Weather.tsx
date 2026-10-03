import { usePollingQuery } from '../hooks/usePollingQuery';
import { usePageVisible } from '../hooks/usePageVisible';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useState, useEffect, useCallback, useRef } from 'react';
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

// Tile math: convert lat/lon to tile coordinates at a given zoom
function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

// Get the pixel offset of a lat/lon within a tile grid
function latLonToPixelOffset(
  lat: number,
  lon: number,
  zoom: number,
  centerTileX: number,
  centerTileY: number,
  tileSize: number,
  gridCols: number,
  gridRows: number
) {
  const n = Math.pow(2, zoom);
  const exactX = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const exactY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const startTileX = centerTileX - Math.floor(gridCols / 2);
  const startTileY = centerTileY - Math.floor(gridRows / 2);

  const px = (exactX - startTileX) * tileSize;
  const py = (exactY - startTileY) * tileSize;
  return { px, py };
}

const TILE_SIZE = 256;
const ZOOM = 7;
const GRID_COLS = 3;
const GRID_ROWS = 2;

interface WeatherProps {
  zip?: string;
}

export function Weather({ zip = '22314' }: WeatherProps) {
  const { data: weather } = usePollingQuery<WeatherData>(`${API_BASE}/api/weather?zip=${encodeURIComponent(zip)}`, REFRESH_INTERVALS.weather);
  const { data: radar } = usePollingQuery<RadarData>(`${API_BASE}/api/radar`, REFRESH_INTERVALS.radar);
  const visible = usePageVisible();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [radarFrame, setRadarFrame] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseCompositeRef = useRef<HTMLCanvasElement | null>(null);
  const baseTilesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const validRadarKeys = useRef(new Set<string>());
  const radarTilesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const drawRef = useRef<() => void>(() => {});
  const pendingDraw = useRef(0);
  const scheduleDraw = useCallback(() => {
    if (pendingDraw.current) return;
    pendingDraw.current = requestAnimationFrame(() => { pendingDraw.current = 0; drawRef.current(); });
  }, []);
  const loadedBaseRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setCurrentTime(new Date()), ANIMATION_INTERVALS.clock);
    return () => clearInterval(interval);
  }, [visible]);

  // Animate radar frames
  useEffect(() => {
    if (!radar || radar.frames.length === 0 || !radarPlaying || !visible || reduceMotion) return;
    const interval = setInterval(() => {
      setRadarFrame((prev) => (prev + 1) % radar.frames.length);
    }, ANIMATION_INTERVALS.radarFrame);
    return () => clearInterval(interval);
  }, [radar, radarPlaying, visible, reduceMotion]);

  // Load OpenStreetMap tiles directly so browser caching and referrers are preserved.
  useEffect(() => {
    if (!weather) return;
    loadedBaseRef.current = false;
    baseTilesRef.current.clear();
    baseCompositeRef.current = null;
    radarTilesRef.current.clear();
    let cancelled = false;

    const { x: cx, y: cy } = latLonToTile(weather.lat, weather.lon, ZOOM);
    const startX = cx - Math.floor(GRID_COLS / 2);
    const startY = cy - Math.floor(GRID_ROWS / 2);

    let loaded = 0;
    const total = GRID_COLS * GRID_ROWS;
    const finishBase = () => {
      if (loaded !== total || cancelled) return;
      const composite = document.createElement('canvas');
      composite.width = GRID_COLS * TILE_SIZE;
      composite.height = GRID_ROWS * TILE_SIZE;
      const context = composite.getContext('2d');
      if (!context) return;
      context.fillStyle = '#1a1a18'; context.fillRect(0, 0, composite.width, composite.height);
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const image = baseTilesRef.current.get(`${startX + col},${startY + row}`);
          if (image) context.drawImage(image, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
      // The map and its tint are static. Composite them once instead of repainting
      // two expensive blend passes for every animated radar frame.
      context.globalCompositeOperation = 'multiply'; context.fillStyle = '#8a8070';
      context.fillRect(0, 0, composite.width, composite.height);
      context.globalCompositeOperation = 'color-burn'; context.globalAlpha = 0.15; context.fillStyle = '#1a3050';
      context.fillRect(0, 0, composite.width, composite.height);
      baseCompositeRef.current = composite;
      loadedBaseRef.current = true;
      scheduleDraw();
    };

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tx = startX + col;
        const ty = startY + row;
        const key = `${tx},${ty}`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cancelled) return;
          baseTilesRef.current.set(key, img);
          loaded++;
          finishBase();
        };
        img.onerror = () => {
          if (cancelled) return;
          loaded++;
          finishBase();
        };
        img.src = `https://tile.openstreetmap.org/${ZOOM}/${tx}/${ty}.png`;
      }
    }
    return () => { cancelled = true; };
    // Tile loading only depends on the map center. Image callbacks retain this render's draw function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.lat, weather?.lon]);

  // Load radar overlay tiles for current frame
  useEffect(() => {
    if (!visible || !weather || !radar || radar.frames.length === 0) return;

    const frame = radar.frames[radarFrame % radar.frames.length];
    if (!frame) return;

    const { x: cx, y: cy } = latLonToTile(weather.lat, weather.lon, ZOOM);
    const startX = cx - Math.floor(GRID_COLS / 2);
    const startY = cy - Math.floor(GRID_ROWS / 2);

    const frameKey = `f${frame.time}-${cx},${cy}`;
    // Retain only frames still advertised for this map location (six images each).
    const allowed = new Set(radar.frames.slice(-24).map(f => `f${f.time}-${cx},${cy}`));
    for (const key of radarTilesRef.current.keys()) {
      if (!allowed.has(key.slice(0, key.lastIndexOf('-')))) radarTilesRef.current.delete(key);
    }
    validRadarKeys.current = allowed;
    // Check if already cached
    if (radarTilesRef.current.has(`${frameKey}-0,0`)) {
      scheduleDraw();
      return;
    }

    let loaded = 0;
    const total = GRID_COLS * GRID_ROWS;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tx = startX + col;
        const ty = startY + row;
        const key = `${frameKey}-${col},${row}`;
        const tileUrl = `${radar.host}${frame.path}/${TILE_SIZE}/${ZOOM}/${tx}/${ty}/2/1_1.png`;
        const proxiedUrl = `${API_BASE}/api/radar/tile?url=${encodeURIComponent(tileUrl)}`;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!validRadarKeys.current.has(frameKey)) return;
          radarTilesRef.current.set(key, img);
          loaded++;
          if (loaded === total) scheduleDraw();
        };
        img.onerror = () => {
          loaded++;
          if (loaded === total) scheduleDraw();
        };
        img.src = proxiedUrl;
      }
    }
    // The frame and map center fully identify the tile set loaded by this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.lat, weather?.lon, radar, radarFrame, visible]);

  // Draw the composite radar on canvas
  const drawRadar = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !weather || !loadedBaseRef.current) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = rect.width;
    const ch = rect.height;

    if (cw <= 0 || ch <= 0 || document.visibilityState === 'hidden') return;
    const width = Math.round(cw * dpr), height = Math.round(ch * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Total grid pixel size
    const gridW = GRID_COLS * TILE_SIZE;
    const gridH = GRID_ROWS * TILE_SIZE;

    // Scale to fit container while covering it
    const scale = Math.max(cw / gridW, ch / gridH);
    const scaledW = gridW * scale;
    const scaledH = gridH * scale;
    const offsetX = (cw - scaledW) / 2;
    const offsetY = (ch - scaledH) / 2;

    ctx.fillStyle = '#1a1a18';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const { x: cx, y: cy } = latLonToTile(weather.lat, weather.lon, ZOOM);
    // Reuse the tinted basemap; only the precipitation overlay changes.
    if (baseCompositeRef.current) ctx.drawImage(baseCompositeRef.current, 0, 0);

    // Draw radar overlay tiles
    if (radar && radar.frames.length > 0) {
      const frame = radar.frames[radarFrame % radar.frames.length];
      if (frame) {
        const frameKey = `f${frame.time}-${cx},${cy}`;
        ctx.globalAlpha = 0.85;
        for (let row = 0; row < GRID_ROWS; row++) {
          for (let col = 0; col < GRID_COLS; col++) {
            const key = `${frameKey}-${col},${row}`;
            const img = radarTilesRef.current.get(key);
            if (img) {
              ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }
    }

    ctx.globalAlpha = 1;

    // Draw location marker
    const { px, py } = latLonToPixelOffset(
      weather.lat,
      weather.lon,
      ZOOM,
      cx,
      cy,
      TILE_SIZE,
      GRID_COLS,
      GRID_ROWS
    );

    // Crosshair
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 60, 60, 0.9)';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [weather, radar, radarFrame]);

  useEffect(() => {
    drawRef.current = drawRadar;
    scheduleDraw();
  }, [drawRadar, scheduleDraw]);

  const hasWeather = !!weather;
  // Redraw on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onResize = scheduleDraw;
    const observer = new ResizeObserver(onResize);
    observer.observe(container);
    return () => { observer.disconnect(); cancelAnimationFrame(pendingDraw.current); pendingDraw.current = 0; };
  }, [scheduleDraw, hasWeather]);

  const toggleRadar = useCallback(() => {
    setRadarPlaying((prev) => !prev);
  }, []);

  if (!weather) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-xs">
        Loading...
      </div>
    );
  }

  const frameTime =
    radar && radar.frames.length > 0
      ? new Date(radar.frames[radarFrame % radar.frames.length]?.time * 1000)
      : null;
  const isNowcast = radar?.frames[radarFrame % radar.frames.length]?.isNowcast;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Conditions */}
      <div className="flex-1 md:flex-none md:w-[160px] flex flex-col px-3 py-2 md:px-2 md:py-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-lg">{mapConditionToIcon(weather.condition)}</span>
            <span className="text-white text-3xl md:text-xl font-light tabular-nums">
              {weather.temperature}°
            </span>
          </div>
          <div className="text-right">
            <div className="text-white text-lg md:text-sm font-medium tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-white/50 text-xs md:text-[10px]">
              {currentTime.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="text-white/70 text-sm md:text-[10px] mt-0.5">{weather.condition}</div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs md:text-[10px] text-white/60 mt-1">
          <span className="truncate">{weather.location}</span>
          {weather.humidity != null && <span>{weather.humidity}%</span>}
          {weather.windSpeed != null && <span>{weather.windSpeed}mph</span>}
          <span>
            H:{weather.high}° L:{weather.low}°
          </span>
        </div>

        <div className="flex-1 flex items-end mt-2 md:mt-1">
          <div className="flex justify-between w-full overflow-hidden">
            {weather.forecast.slice(0, 5).map((day) => (
              <div key={day.day} className="flex flex-col items-center text-xs md:text-[9px]">
                <span className="text-white/50">{day.day}</span>
                <span className="text-base md:text-xs">{mapConditionToIcon(day.condition)}</span>
                <span className="text-white/80 tabular-nums">{day.high}°</span>
                {day.low != null && (
                  <span className="text-white/40 tabular-nums md:hidden">{day.low}°</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radar Map — canvas-based multi-tile composite */}
      <div
        ref={containerRef}
        className="w-full h-40 md:w-auto md:h-full md:flex-1 relative bg-[#1a1a18] shrink-0 overflow-hidden cursor-pointer"
        onClick={toggleRadar}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        <div
          className="absolute bottom-5 right-1 bg-black/80 px-1 text-[9px] text-white/80"
          onClick={(event) => event.stopPropagation()}
        >
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a> contributors
          {' · '}<a href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">RainViewer</a>
        </div>

        {/* Radar legend */}
        <div className="absolute top-1 right-1 flex gap-px items-center">
          {['#00ff00', '#ffff00', '#ff8800', '#ff0000', '#cc00cc'].map((color) => (
            <div
              key={color}
              className="w-2 h-1.5 rounded-[1px]"
              style={{ backgroundColor: color, opacity: 0.8 }}
            />
          ))}
          <span className="text-[7px] text-white/40 ml-0.5">dBZ</span>
        </div>

        {/* Timeline bar */}
        {radar && radar.frames.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5 flex items-center gap-1.5">
            <span className="text-[8px] text-white/50">{radarPlaying ? '▶' : '⏸'}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="h-full w-full origin-left bg-blue-500/60 rounded-full transition-transform duration-300 motion-reduce:transition-none"
                style={{
                  transform: `scaleX(${((radarFrame % radar.frames.length) + 1) / radar.frames.length})`,
                }}
              />
              {/* Nowcast divider */}
              {radar.frames.some((f) => f.isNowcast) && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/30"
                  style={{
                    left: `${
                      (radar.frames.filter((f) => !f.isNowcast).length / radar.frames.length) * 100
                    }%`,
                  }}
                />
              )}
            </div>
            <span className="text-[8px] text-white/50 tabular-nums min-w-[32px] text-right">
              {frameTime
                ? frameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
            {isNowcast && (
              <span className="text-[7px] text-cyan-400/70 font-medium">FCST</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
