'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { TripReport } from '@/types/trip-reports';
import { getImageUrl } from '@/lib/sanity';
import { format } from 'date-fns';

interface TripCardProps {
  trip: TripReport;
  index: number;
}

export default function TripCard({ trip, index }: TripCardProps) {
  const heroImage = trip.images?.[0];
  const imageUrl = heroImage ? getImageUrl(heroImage, 800, 600) : null;
  const formattedDate = format(new Date(trip.date), 'MMM d, yyyy');

  return (
    <Link href={`/trip-reports/${trip._id}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
      >
        {/* Hero Image */}
        <div className="relative h-64 overflow-hidden bg-gray-200">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={trip.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          <div className="absolute top-4 right-4">
            <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-900">
              {trip.images?.length || 0} photos
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2">
              {trip.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <span className="font-medium">{trip.author}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>

          <p className="text-gray-700 line-clamp-2 mb-4">
            {trip.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-brand-green">
                {trip.location.name}
              </span>
              {trip.location.region && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {trip.location.region}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {trip.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {trip.tags.length > 3 && (
                <span className="px-2 py-1 text-gray-500 text-xs">
                  +{trip.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
