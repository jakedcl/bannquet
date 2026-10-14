'use client';

import { useEffect, useMemo, useState } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import TripCard from '@/components/trip-reports/TripCard';
import { Button, Inset, StatusBar, Window } from '@/components/retro';
import { TripReportListItem } from '@/types/trip-reports';

const TAGS = [
  'trail-running',
  'hiking',
  'mountaineering',
  'climbing',
  'ice-climb',
  'scramble',
  'bike',
  'ski-split-tour',
  'backpacking',
  'camping',
  'snowshoeing',
  'rock-climbing',
];

export default function TripReportsPage() {
  const [trips, setTrips] = useState<TripReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [author, setAuthor] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/trip-reports');
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch trip reports');
        }
        if (!cancelled) {
          setTrips(data.data || []);
          setConfigured(data.configured !== false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const authors = useMemo(
    () => Array.from(new Set(trips.map((trip) => trip.authorName))).sort(),
    [trips],
  );

  const visible = trips.filter((trip) => {
    if (author && trip.authorName !== author) return false;
    if (tag && !trip.tags.includes(tag)) return false;
    return true;
  });

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green/70">trip reports</p>
            <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">Trip Reports</h1>
            <p className="max-w-2xl text-gray-600">
              Stories and photos from mountain adventures across the Northeast.
            </p>
          </div>
          <div className="flex gap-3">
            <Button tone="green" href="/trip-reports/new">Write a post</Button>
            <Button tone="blue" href="/map">Map</Button>
          </div>
        </div>

        <Window title="Filter" className="mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              tone={!author && !tag ? 'yellow' : 'default'}
              onClick={() => {
                setAuthor('');
                setTag('');
              }}
            >
              All trips
            </Button>
            <div className="flex flex-wrap gap-4">
              <Inset>
                <select
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  className="bg-transparent px-2 py-1 text-sm font-bold uppercase"
                  aria-label="Filter by author"
                >
                  <option value="">All authors</option>
                  {authors.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </Inset>
              <Inset>
                <select
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  className="bg-transparent px-2 py-1 text-sm font-bold uppercase"
                  aria-label="Filter by tag"
                >
                  <option value="">All tags</option>
                  {TAGS.map((value) => (
                    <option key={value} value={value}>
                      {value.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </Inset>
            </div>
          </div>
        </Window>

        {loading && (
          <Window title="Loading">
            <p className="font-mono text-sm uppercase tracking-wide text-gray-600">Loading trip reports...</p>
          </Window>
        )}

        {error && (
          <Window title="Error">
            <p className="mb-4 text-red-800">{error}</p>
            <Button tone="orange" onClick={() => window.location.reload()}>Try again</Button>
          </Window>
        )}

        {!loading && !error && (
          <>
            {visible.length === 0 ? (
              <Window title="Empty">
                <p className="text-gray-700">
                  {configured
                    ? 'No trip reports match this filter.'
                    : 'Trip reports show up here after the database is connected. Weather still works without it.'}
                </p>
              </Window>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((trip, index) => (
                  <TripCard key={trip.id} trip={trip} index={index} />
                ))}
              </div>
            )}
            <div className="mt-8">
              <StatusBar>
                {configured ? `${visible.length} shown` : 'database not connected'} · {trips.length} published
              </StatusBar>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
