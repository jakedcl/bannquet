'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { TripReport } from '@/types/trip-reports';
import { getImageUrl } from '@/lib/sanity';
import { format } from 'date-fns';

interface TripCardProps {
  trip: TripReport;
  index: number;
}

interface PortableTextBlock {
  _type: string;
  asset?: {
    _ref?: string;
    _type?: string;
  };
  children?: Array<{
    text?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export default function TripCard({ trip, index }: TripCardProps) {
  // Extract first image from body
  const firstImageBlock = trip.body?.find((block: PortableTextBlock) => block._type === 'image');
  const heroImage = firstImageBlock?.asset;
  const imageUrl = heroImage ? getImageUrl(
    {
      asset: {
        _ref: heroImage._ref || (typeof heroImage === 'string' ? heroImage : undefined),
        _type: 'reference',
      },
    },
    800,
    600
  ) : null;
  const formattedDate = format(new Date(trip.tripDate), 'MMM d, yyyy');
  
  // Extract text preview from body
  const textBlocks = trip.body?.filter((block: PortableTextBlock) => block._type === 'block') || [];
  const previewText = textBlocks
    .map((block: PortableTextBlock) => block.children?.map((child) => child.text || '').join('') || '')
    .join(' ')
    .substring(0, 150);

  return (
    <Link href={`/trip-reports/${trip._id}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="group retro-box overflow-hidden transition-all hover:scale-[1.02] rounded-none"
      >
        {/* Hero Image */}
        <div className="relative h-64 overflow-hidden bg-gray-200">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={trip.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          <div className="absolute top-4 right-4">
            <span className="retro-box-inset bg-white px-3 py-1 text-xs font-bold text-gray-900 uppercase rounded-none">
              {trip.body?.filter((b: PortableTextBlock) => b._type === 'image').length || 0} photos
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 retro-text-shadow">
              {trip.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <span className="font-medium">{trip.authorName}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>

          {previewText && (
            <p className="text-gray-700 line-clamp-2 mb-4">
              {previewText}...
            </p>
          )}

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trip.tags.map((tag) => (
                <span
                  key={tag}
                  className="retro-box-inset px-2 py-1 bg-gray-200 text-gray-800 text-xs font-bold uppercase rounded-none"
                >
                  {tag.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
