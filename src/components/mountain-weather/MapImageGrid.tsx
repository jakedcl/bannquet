import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { MapImageAsset } from '@/lib/mountain-weather/map-types';

export function MapImageGrid({
  title,
  sourceUrl,
  images,
  refreshNote,
}: {
  title: string;
  sourceUrl: string;
  images: MapImageAsset[];
  refreshNote: string;
}) {
  if (!images.length) return null;
  return (
    <CollapsibleSection title={title} subtitle={refreshNote}>
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((img) => (
          <figure key={img.id} className="space-y-1">
            <figcaption className="text-xs font-bold">{img.label}</figcaption>
            <p className="text-[10px] text-gray-700">
              {img.org} · valid/frame: {img.validTimeLabel ?? 'not published'}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.label} className="max-w-full border border-[#5c3a1e]/30 bg-white" />
            <p className="text-[10px] text-gray-700">
              <a href={img.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                {img.org} image URL
              </a>
            </p>
          </figure>
        ))}
      </div>
      <p className="text-xs text-gray-700">
        {refreshNote} ·{' '}
        <a href={sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </p>
    </CollapsibleSection>
  );
}