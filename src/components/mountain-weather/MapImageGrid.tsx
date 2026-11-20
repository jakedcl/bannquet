import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { MapImageAsset } from '@/lib/mountain-weather/map-types';
import { ImageCaption, SourceReceipt } from '@/components/mountain-weather/kit';

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.label} className="max-w-full border border-hairline bg-white" />
            <ImageCaption label={img.validTimeLabel} href={img.url} />
          </figure>
        ))}
      </div>
      <SourceReceipt org={images[0].org} product={refreshNote} href={sourceUrl} linkLabel="Source page" />
    </CollapsibleSection>
  );
}