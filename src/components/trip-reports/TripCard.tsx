'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/retro';
import { ACTIVITY_META, isActivity, mapColorForActivity } from '@/lib/activities';
import { formatTripDate } from '@/lib/utils';
import { TripReportListItem } from '@/types/trip-reports';

interface TripCardProps {
  trip: TripReportListItem;
  index: number;
}

function tagLabel(tag: string) {
  return tag.replace(/-/g, ' ');
}

export default function TripCard({ trip, index }: TripCardProps) {
  return (
    <Link href={`/trip-reports/${trip.id}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="group retro-box overflow-hidden rounded-none transition-all hover:scale-[1.02]"
      >
        <div className="relative h-64 overflow-hidden bg-gray-200">
          {trip.coverUrl ? (
            <Image
              src={trip.coverUrl}
              alt={trip.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          <div className="absolute top-4 right-4">
            <span className="retro-box-inset bg-white px-3 py-1 text-xs font-bold uppercase text-gray-900">
              {trip.photoCount} photos
            </span>
          </div>
        </div>

        <div className="p-6">
          <h2 className="mb-2 line-clamp-2 text-xl font-bold text-gray-900 retro-text-shadow transition-colors group-hover:text-brand-green">
            {trip.title}
          </h2>

          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">{trip.authorName}</span>
            <span>•</span>
            <span>{formatTripDate(trip.tripDate)}</span>
            {trip.activity && isActivity(trip.activity) ? (
              <span className="inline-flex items-center gap-1 font-bold text-gray-800">
                <span className="inline-block h-2 w-2" style={{ background: mapColorForActivity(trip.activity) }} />
                {ACTIVITY_META[trip.activity].label}
              </span>
            ) : null}
          </div>

          {trip.excerpt ? (
            <p className="mb-4 line-clamp-2 text-gray-700">{trip.excerpt}</p>
          ) : null}

          {trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.tags.map((tag) => (
                <Badge key={tag}>{tagLabel(tag)}</Badge>
              ))}
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
