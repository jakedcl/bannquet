'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { TripReport } from '@/types/trip-reports';
import { getImageUrl } from '@/lib/sanity';
import { format } from 'date-fns';

export default function TripReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<TripReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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

  const formattedDate = format(new Date(trip.date), 'MMMM d, yyyy');
  const images = trip.images || [];
  const selectedImage = images[selectedImageIndex];
  const selectedImageUrl = selectedImage ? getImageUrl(selectedImage, 1200, 800) : null;

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

        {/* Hero Image */}
        {selectedImageUrl && (
          <div className="relative h-[500px] rounded-2xl overflow-hidden mb-8 bg-gray-200">
            <img
              src={selectedImageUrl}
              alt={trip.title}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors"
                  aria-label="Next image"
                >
                  →
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-8">
            {images.map((image, index) => {
              const thumbUrl = getImageUrl(image, 200, 200);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === index
                      ? 'border-brand-green ring-2 ring-brand-green/50'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {trip.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-medium">{trip.author}</span>
              </div>
              <span>•</span>
              <span>{formattedDate}</span>
              {trip.location.region && (
                <>
                  <span>•</span>
                  <span>{trip.location.region}</span>
                </>
              )}
            </div>
            <div className="mt-3">
              <span className="text-lg font-semibold text-brand-green">
                {trip.location.name}
              </span>
            </div>
          </div>

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {trip.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {trip.description}
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
