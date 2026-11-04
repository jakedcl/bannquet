'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronIcon } from '@/components/hub/Icons';

type WeatherStat = {
  label: string;
  value: string;
  location: string;
};

/** "HIGHEST WIND" -> "Highest wind" */
function sentence(label: string): string {
  const lower = label.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

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
    <section aria-label="Live conditions" className="ui-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5">
        <p className="t-eyebrow flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Live across the Northeast
        </p>
        <Link href="/conditions" className="t-subhead inline-flex items-center gap-1 text-ui-accent no-underline">
          All
          <ChevronIcon className="h-3 w-2" />
        </Link>
      </div>
      {loading ? (
        <div className="grid gap-2 px-4 pb-4 pt-2 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-xl bg-ui-fill sm:h-[5.5rem]" />
          ))}
        </div>
      ) : error || stats.length === 0 ? (
        <p className="t-subhead px-4 pb-4 pt-1 text-ui-label-2">{error ?? 'No stats yet.'}</p>
      ) : (
        <ul className="grid gap-2 px-4 pb-4 pt-2 sm:grid-cols-3">
          {stats.map((stat) => (
            <li
              key={`${stat.label}-${stat.location}`}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-ui-surface-2 px-3.5 py-2.5 sm:block sm:py-3"
            >
              <span className="min-w-0">
                <span className="t-footnote block text-ui-label-2">{sentence(stat.label)}</span>
                <span className="t-caption block truncate text-ui-label-2 sm:hidden">{stat.location}</span>
              </span>
              <span className="t-title3 shrink-0 tabular-nums sm:mt-0.5 sm:block">{stat.value}</span>
              <span className="t-caption mt-0.5 hidden truncate text-ui-label-2 sm:block">{stat.location}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
