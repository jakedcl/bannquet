export const PHOTO_MAX_EDGE = 2000;
export const PHOTO_THUMB_MAX_EDGE = 480;
export const PHOTO_JPEG_QUALITY = 0.85;

/** Small grid / chip photos: Blob thumb when present, else full URL via Vercel Image Optimization. */
export function smallPhotoImageProps(photo: {
  url: string;
  thumbUrl?: string | null;
}): { src: string; unoptimized: boolean } {
  if (photo.thumbUrl) {
    return { src: photo.thumbUrl, unoptimized: true };
  }
  return { src: photo.url, unoptimized: false };
}

export function fittedSize(
  width: number,
  height: number,
  maxEdge = PHOTO_MAX_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / edge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}


/** Width and height from a JPEG, or null if the buffer is not a JPEG with a size marker. */
export function jpegDimensions(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1]!;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = (data[offset + 2]! << 8) | data[offset + 3]!;
    if (length < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      const height = (data[offset + 5]! << 8) | data[offset + 6]!;
      const width = (data[offset + 7]! << 8) | data[offset + 8]!;
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    offset += 2 + length;
  }
  return null;
}

export function isPublicBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export function isLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Reads a lat/lng pair from form fields. A blank field means no point:
 * Number('') is 0, which would quietly save the pin at 0, 0.
 */
export function formLatLng(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const rawLat = String(lat ?? '').trim();
  const rawLng = String(lng ?? '').trim();
  if (!rawLat || !rawLng) return null;
  const point = { lat: Number(rawLat), lng: Number(rawLng) };
  return isLatLng(point.lat, point.lng) ? point : null;
}
