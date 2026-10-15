'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type WeatherStat = {
  label: string;
  value: string;
  location: string;
};

export default function WeatherTicker({ placement = 'header' }: { placement?: 'header' | 'page' }) {
  const quiet = placement === 'page'
    ? 'flex h-12 w-full items-center bg-brand-green px-4 text-xs font-bold uppercase tracking-wider text-white'
    : 'flex h-full items-center px-4 text-xs font-bold uppercase tracking-wider text-white/80';
  const live = placement === 'page'
    ? 'flex h-12 w-full min-w-0 items-center overflow-hidden bg-brand-green'
    : 'flex h-full w-full min-w-0 items-center overflow-hidden border-r-2 border-white/20 bg-brand-green-dark/50';
  const [stats, setStats] = useState<WeatherStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(16);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/weather/extremes');
        let data: { success?: boolean; stats?: WeatherStat[]; error?: string } | null = null;
        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const bodyText = await res.text();
          setError(
            bodyText?.slice(0, 80) ||
            `Weather feed unavailable (${res.status})`
          );
          return;
        }

        if (data?.success && Array.isArray(data.stats)) {
          setStats(data.stats);
          setError(null);
        } else {
          setError(data?.error || `Weather feed unavailable (${res.status})`);
        }
      } catch (err) {
        console.error('Failed to fetch weather extremes:', err);
        setError('Weather feed unavailable');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.scrollWidth;
      const viewport = node.parentElement?.clientWidth ?? width;
      const pxPerSec = viewport < 768 ? 110 : 100;
      setDuration(Math.max(8, (width / 2) / pxPerSec));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.parentElement) observer.observe(node.parentElement);
    return () => observer.disconnect();
  }, [stats]);

  if (loading) {
    return (
      <Link href="/conditions" aria-label="Live conditions" className={quiet}>
        <span className="animate-pulse">LOADING CONDITIONS...</span>
      </Link>
    );
  }

  if (error) {
    return (
      <Link href="/conditions" aria-label="Live conditions" className={quiet}>
        <span className="text-yellow-400 mr-2">●</span>
        <span className="text-white/90">WEATHER FEED:</span>
        <span className="ml-2 text-white/70">{error}</span>
      </Link>
    );
  }

  if (stats.length === 0) {
    return (
      <Link href="/conditions" aria-label="Live conditions" className={quiet}>
        <span className="text-yellow-400 mr-2">●</span>
        <span className="text-white/90">WEATHER FEED:</span>
        <span className="ml-2 text-white/70">No stats yet</span>
      </Link>
    );
  }

  // Duplicate stats for seamless loop
  const displayStats = [...stats, ...stats];

  return (
    <Link href="/conditions" aria-label="Live conditions" className={live}>
      <div className="flex items-center text-yellow-400 font-bold text-xs uppercase tracking-wider px-2 sm:px-3 whitespace-nowrap">
        <span className="animate-pulse mr-2">●</span>
        LIVE:
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-max items-center whitespace-nowrap text-xs font-bold uppercase tracking-wider text-white weather-ticker-scroll"
          style={{ animationDuration: `${duration}s` }}
        >
          {displayStats.map((stat, idx) => (
            <div key={idx} className="flex items-center px-6">
              <span className="text-white/90">{stat.label}:</span>
              <span className="text-yellow-400 mx-2 font-bold">{stat.value}</span>
              <span className="text-white/70">@ {stat.location}</span>
              <span className="mx-4 text-white/40">•</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
