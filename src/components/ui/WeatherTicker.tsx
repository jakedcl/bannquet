'use client';

import { useEffect, useState } from 'react';

type WeatherStat = {
  label: string;
  value: string;
  location: string;
};

export default function WeatherTicker() {
  const [stats, setStats] = useState<WeatherStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/weather/extremes');
        let data: any = null;
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

        if (data.success && Array.isArray(data.stats)) {
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

  if (loading) {
    return (
      <div className="flex items-center h-full px-4 text-white/80 text-xs font-bold uppercase tracking-wider">
        <span className="animate-pulse">LOADING CONDITIONS...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center h-full px-4 text-white/80 text-xs font-bold uppercase tracking-wider">
        <span className="text-yellow-400 mr-2">●</span>
        <span className="text-white/90">WEATHER FEED:</span>
        <span className="ml-2 text-white/70">{error}</span>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex items-center h-full px-4 text-white/80 text-xs font-bold uppercase tracking-wider">
        <span className="text-yellow-400 mr-2">●</span>
        <span className="text-white/90">WEATHER FEED:</span>
        <span className="ml-2 text-white/70">No stats yet</span>
      </div>
    );
  }

  // Duplicate stats for seamless loop
  const displayStats = [...stats, ...stats];

  return (
    <div className="flex w-full min-w-0 items-center h-full overflow-hidden bg-brand-green-dark/50 border-r-2 border-white/20">
      <div className="flex items-center text-yellow-400 font-bold text-xs uppercase tracking-wider px-2 sm:px-3 whitespace-nowrap">
        <span className="animate-pulse mr-2">●</span>
        LIVE:
      </div>
      <div className="flex-1 overflow-hidden">
        <div 
          className="flex items-center text-white text-xs font-bold uppercase tracking-wider whitespace-nowrap weather-ticker-scroll"
          style={{
            animationDuration: `${stats.length * 8}s`,
          }}
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
    </div>
  );
}
