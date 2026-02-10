'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { TripReport } from '@/types/trip-reports';
import { format } from 'date-fns';
import PortableTextRenderer from '@/components/trip-reports/PortableTextRenderer';

export default function TripReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<TripReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTrip(params.id as string);
    }
  }, [params.id]);

  const fetchTrip = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trip-reports/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trip report');
      }

      setTrip(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green"></div>
            <p className="mt-4 text-gray-600">Loading trip report...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error || !trip) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Trip report not found'}</p>
            <Link
              href="/trip-reports"
              className="text-brand-green hover:underline font-medium"
            >
              ← Back to Trip Reports
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const formattedDate = format(new Date(trip.tripDate), 'MMMM d, yyyy');

  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <Link
          href="/trip-reports"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-brand-green mb-6 transition-colors"
        >
          ← Back to Trip Reports
        </Link>


        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {trip.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{trip.authorName}</span>
              </div>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>

            {/* Tags */}
            {trip.tags && trip.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {trip.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-brand-green/10 text-brand-green text-sm rounded-full font-medium"
                  >
                    {tag.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="mt-6">
            <PortableTextRenderer content={trip.body} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
