'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type WeatherStat = {
  label: string;
  value: string;
  location: string;
  stationId?: string;
  ageMinutes?: number | null;
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
    <section aria-label="Live conditions" className="panel panel-green">
      <div className="flex items-center justify-between gap-3 px-3.5 pt-2.5">
        <p className="eyebrow flex items-center gap-2 text-yellow">
          <span className="animate-pulse motion-reduce:animate-none" aria-hidden="true">●</span>
          Live across the Northeast
        </p>
        <Link href="/mountain-weather/conditions" className="caps -my-2 inline-flex min-h-11 items-center px-2 text-meta text-on-dark no-underline hover:underline">
          All ›
        </Link>
      </div>
      {loading ? (
        <p className="animate-pulse px-3.5 pb-3 pt-2 text-caption font-bold uppercase text-on-dark/80">Loading conditions…</p>
      ) : error || stats.length === 0 ? (
        <p className="px-3.5 pb-3 pt-2 text-caption font-bold text-on-dark/80">{error ?? 'No live readings yet.'}</p>
      ) : (
        <ul className="grid min-w-0 gap-px px-3.5 pb-3 pt-2 sm:grid-cols-3 sm:gap-3">
          {stats.map((stat) => (
            <li
              key={`${stat.label}-${stat.location}`}
              className="flex min-w-0 items-baseline justify-between gap-3 border-t border-on-dark/15 py-2 first:border-t-0 sm:block sm:border-t-0 sm:border-l sm:py-0 sm:pl-3 sm:first:border-l-0 sm:first:pl-0"
            >
              <span className="min-w-0">
                <span className="caps block text-caption text-on-dark/90">{stat.label}</span>
                <span className="block truncate text-caption text-on-dark/70 sm:hidden">{stat.location}</span>
              </span>
              <span className="shrink-0 text-heading font-bold tabular-nums text-yellow sm:mt-0.5 sm:block sm:text-stat">{stat.value}</span>
              <span className="hidden truncate text-caption text-on-dark/70 sm:block">
                @ {stat.location}
                {'stationId' in stat && stat.stationId ? ` · ${stat.stationId}` : ''}
                {'ageMinutes' in stat && stat.ageMinutes != null ? ` · ${stat.ageMinutes}m` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
