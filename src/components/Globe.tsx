import { useEffect, useState } from 'react';
import { ANIMATION_INTERVALS } from '../config';

const CITIES = [
  { name: 'Washington, DC', lat: 38.9, lon: -77, timeZone: 'America/New_York' },
  { name: 'London', lat: 51.5, lon: -0.1, timeZone: 'Europe/London' },
  { name: 'Beijing', lat: 39.9, lon: 116.4, timeZone: 'Asia/Shanghai' },
  { name: 'Moscow', lat: 55.8, lon: 37.6, timeZone: 'Europe/Moscow' },
  { name: 'Tokyo', lat: 35.7, lon: 139.7, timeZone: 'Asia/Tokyo' },
  { name: 'Jerusalem', lat: 31.8, lon: 35.2, timeZone: 'Asia/Jerusalem' },
  { name: 'Sydney', lat: -33.9, lon: 151.2, timeZone: 'Australia/Sydney' },
  { name: 'São Paulo', lat: -23.5, lon: -46.6, timeZone: 'America/Sao_Paulo' },
  { name: 'Lagos', lat: 6.5, lon: 3.4, timeZone: 'Africa/Lagos' },
  { name: 'New Delhi', lat: 28.6, lon: 77.2, timeZone: 'Asia/Kolkata' },
] as const;

function getLocalTime(timeZone: string): string {
  return new Intl.DateTimeFormat([], {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

function getTexturePosition(lat: number, lon: number): string {
  const x = 50 + lon / 3.6;
  const y = 50 - lat * 0.18;
  return `${x}% ${y}%`;
}

export function Globe() {
  const [cityIndex, setCityIndex] = useState(0);
  const [, setClockTick] = useState(0);
  const city = CITIES[cityIndex];

  useEffect(() => {
    const rotation = window.setInterval(() => {
      setCityIndex(index => (index + 1) % CITIES.length);
    }, ANIMATION_INTERVALS.globeRotation);
    const clock = window.setInterval(() => setClockTick(tick => tick + 1), 30_000);

    return () => {
      window.clearInterval(rotation);
      window.clearInterval(clock);
    };
  }, []);

  const localTime = getLocalTime(city.timeZone);

  const selectCity = (direction: number) => {
    setCityIndex(index => (index + direction + CITIES.length) % CITIES.length);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle_at_center,#101b2d_0%,#080c13_70%)]">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.16),transparent_58%)]" />

      <button
        type="button"
        onClick={() => selectCity(1)}
        aria-label={`Globe focused on ${city.name}. Show next city`}
        className="absolute left-1/2 top-[46%] h-[154px] w-[154px] -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <span
          className="absolute inset-0 rounded-full bg-[#17304a] bg-no-repeat shadow-[inset_-25px_-10px_35px_rgba(0,0,0,0.78),inset_10px_8px_22px_rgba(147,197,253,0.18),0_0_24px_rgba(59,130,246,0.18)] transition-[background-position] duration-[1800ms] ease-out motion-reduce:transition-none"
          style={{
            backgroundImage: "url('/textures/earth-day.jpg')",
            backgroundSize: 'auto 116%',
            backgroundPosition: getTexturePosition(city.lat, city.lon),
          }}
        />

        <svg
          className="absolute inset-0 h-full w-full rounded-full opacity-25"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="49" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" rx="49" ry="17" fill="none" stroke="white" strokeWidth="0.35" />
          <ellipse cx="50" cy="50" rx="49" ry="34" fill="none" stroke="white" strokeWidth="0.25" />
          <ellipse cx="50" cy="50" rx="17" ry="49" fill="none" stroke="white" strokeWidth="0.3" />
          <ellipse cx="50" cy="50" rx="34" ry="49" fill="none" stroke="white" strokeWidth="0.25" />
        </svg>

        <span className="absolute inset-0 rounded-full bg-[linear-gradient(100deg,rgba(0,0,0,0.08)_20%,transparent_46%,rgba(0,0,0,0.58)_78%)]" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.18),0_0_8px_rgba(248,113,113,0.8)]" />
      </button>

      <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => selectCity(-1)}
          aria-label="Previous city"
          className="h-5 w-5 rounded text-white/35 hover:bg-white/5 hover:text-white/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
        >
          ‹
        </button>
        <div className="min-w-[138px] text-center">
          <div className="truncate text-[10px] font-medium text-white/80">{city.name}</div>
          <div className="text-[9px] tabular-nums text-blue-300/70">{localTime}</div>
        </div>
        <button
          type="button"
          onClick={() => selectCity(1)}
          aria-label="Next city"
          className="h-5 w-5 rounded text-white/35 hover:bg-white/5 hover:text-white/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
        >
          ›
        </button>
      </div>
    </div>
  );
}
