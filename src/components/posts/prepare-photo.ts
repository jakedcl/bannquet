import { upload } from '@vercel/blob/client';
import exifr from 'exifr';
import {
  fittedSize,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_EDGE,
  PHOTO_THUMB_MAX_EDGE,
  isLatLng,
} from '@/lib/photos';

export type UploadedPhoto = {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  lat: number | null;
  lng: number | null;
  source: 'exif' | 'manual' | null;
  previewUrl: string;
};

async function jpegBlob(
  bitmap: ImageBitmap,
  maxEdge: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const size = fittedSize(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not resize that photo.');
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not resize that photo.');
  return { blob, width: size.width, height: size.height };
}

/** Decode the file once and make both sizes from it. Phones run out of memory decoding a big photo twice. */
async function jpegSizes(file: File): Promise<{
  resized: { blob: Blob; width: number; height: number };
  thumb: { blob: Blob; width: number; height: number };
}> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not use that photo. Try a JPG or PNG.');
  }
  try {
    const resized = await jpegBlob(bitmap, PHOTO_MAX_EDGE);
    const thumb = await jpegBlob(bitmap, PHOTO_THUMB_MAX_EDGE);
    return { resized, thumb };
  } finally {
    bitmap.close();
  }
}

export async function preparePhoto(file: File): Promise<UploadedPhoto> {
  const gps = await exifr.gps(file).catch(() => null);
  const lat = typeof gps?.latitude === 'number' ? gps.latitude : null;
  const lng = typeof gps?.longitude === 'number' ? gps.longitude : null;
  const located = lat != null && lng != null && isLatLng(lat, lng);
  const { resized, thumb } = await jpegSizes(file);
  const photoId = crypto.randomUUID();
  let stored: { url: string };
  let thumbStored: { url: string };
  try {
    [stored, thumbStored] = await Promise.all([
      upload(`photos/${photoId}.jpg`, resized.blob, {
        access: 'public',
        handleUploadUrl: '/api/photos/upload',
        contentType: 'image/jpeg',
      }),
      upload(`photos/${photoId}-thumb.jpg`, thumb.blob, {
        access: 'public',
        handleUploadUrl: '/api/photos/upload',
        contentType: 'image/jpeg',
      }),
    ]);
  } catch {
    throw new Error('That photo did not upload. Try again.');
  }
  return {
    url: stored.url,
    thumbUrl: thumbStored.url,
    width: resized.width,
    height: resized.height,
    lat: located ? lat : null,
    lng: located ? lng : null,
    source: located ? 'exif' : null,
    previewUrl: URL.createObjectURL(resized.blob),
  };
}
