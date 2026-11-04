'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type WeatherStat = {
  label: string;
  value: string;
  location: string;
};

/** Live Northeast extremes for the mountain weather hub. Refreshes every 5 minutes. */
export default function WeatherTicker() {
  const [stats, setStats] = useState<WeatherStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/weather/extremes');
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const bodyText = await res.text();
          setError(bodyText?.slice(0, 80) || `Weather feed unavailable (${res.status})`);
          return;
        }
        const data = (await res.json()) as { success?: boolean; stats?: WeatherStat[]; error?: string } | null;
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
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section aria-label="Live conditions" className="retro-banner !p-0 text-white">
      <div className="flex items-center justify-between gap-3 px-3 pt-2.5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffd700]">
          <span className="animate-pulse motion-reduce:animate-none" aria-hidden="true">●</span>
          Live across the Northeast
        </p>
        <Link href="/conditions" className="-my-2 inline-flex min-h-11 items-center px-2 text-sm font-bold uppercase tracking-wider text-white no-underline hover:underline">
          All ›
        </Link>
      </div>
      {loading ? (
        <p className="animate-pulse px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-wider text-white/80">Loading conditions…</p>
      ) : error || stats.length === 0 ? (
        <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-wider text-white/80">{error ?? 'No stats yet.'}</p>
      ) : (
        <ul className="grid gap-px px-3 pb-3 pt-2 sm:grid-cols-3 sm:gap-3">
          {stats.map((stat) => (
            <li
              key={`${stat.label}-${stat.location}`}
              className="flex min-w-0 items-baseline justify-between gap-3 border-t border-white/15 py-1.5 first:border-t-0 sm:block sm:border-t-0 sm:border-l sm:py-0 sm:pl-3 sm:first:border-l-0 sm:first:pl-0"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wider text-white/85">{stat.label}</span>
                <span className="block truncate text-xs text-white/70 sm:hidden">{stat.location}</span>
              </span>
              <span className="shrink-0 text-base font-bold tabular-nums text-[#ffd700] sm:mt-0.5 sm:block sm:text-lg">{stat.value}</span>
              <span className="hidden truncate text-xs text-white/70 sm:block">@ {stat.location}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
