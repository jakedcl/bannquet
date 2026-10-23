import Image from 'next/image';
import { smallPhotoImageProps } from '@/lib/photos';

type SmallPhotoImageProps = {
  url: string;
  thumbUrl?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

export function SmallPhotoImage({ url, thumbUrl, alt, width, height, className }: SmallPhotoImageProps) {
  const { src, unoptimized } = smallPhotoImageProps({ url, thumbUrl });
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={className}
    />
  );
}

export function draftPhotoSources(item: {
  kind: string;
  thumb: string | null;
  photoUrl?: string | null;
  photoThumbUrl?: string | null;
}): { url: string; thumbUrl: string | null } | null {
  if (item.kind !== 'photo') return null;
  const url = item.photoUrl ?? item.thumb;
  if (!url) return null;
  return { url, thumbUrl: item.photoUrl ? (item.photoThumbUrl ?? null) : null };
}
