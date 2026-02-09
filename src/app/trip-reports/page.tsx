'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import TripCard from '@/components/trip-reports/TripCard';
import { TripReport } from '@/types/trip-reports';

export default function TripReportsPage() {
  const [trips, setTrips] = useState<TripReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'author' | 'tag'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  useEffect(() => {
    fetchTrips();
  }, [filter, filterValue]);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/trip-reports';
      const params = new URLSearchParams();

      if (filter === 'author' && filterValue) {
        params.append('author', filterValue);
      } else if (filter === 'tag' && filterValue) {
        params.append('tag', filterValue);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trip reports');
      }

      setTrips(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get unique authors and tags for filters
  const authors = Array.from(new Set(trips.map(t => t.author))).sort();
  const allTags = Array.from(new Set(trips.flatMap(t => t.tags || []))).sort();

  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green/70">trip reports</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Our Adventures
            </h1>
            <p className="text-gray-600 max-w-2xl">
              Stories and photos from our mountain adventures across the US
            </p>
          </div>

          <Link
            href="/trip-reports/submit"
            className="px-6 py-3 bg-brand-green text-white rounded-full font-semibold hover:bg-brand-green-dark transition-colors whitespace-nowrap"
          >
            Submit Trip Report
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                setFilter('all');
                setFilterValue('');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Trips
            </button>

            <select
              value={filter === 'author' ? filterValue : ''}
              onChange={(e) => {
                setFilter('author');
                setFilterValue(e.target.value);
              }}
              className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium bg-white focus:ring-2 focus:ring-brand-green focus:border-transparent"
            >
              <option value="">Filter by Author</option>
              {authors.map(author => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>

            <select
              value={filter === 'tag' ? filterValue : ''}
              onChange={(e) => {
                setFilter('tag');
                setFilterValue(e.target.value);
              }}
              className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium bg-white focus:ring-2 focus:ring-brand-green focus:border-transparent"
            >
              <option value="">Filter by Tag</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green"></div>
            <p className="mt-4 text-gray-600">Loading trip reports...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchTrips}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Trip Reports Grid */}
        {!loading && !error && (
          <>
            {trips.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-4">No trip reports found</p>
                <Link
                  href="/trip-reports/submit"
                  className="text-brand-green hover:underline font-medium"
                >
                  Be the first to submit one!
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip, index) => (
                  <TripCard key={trip._id} trip={trip} index={index} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
