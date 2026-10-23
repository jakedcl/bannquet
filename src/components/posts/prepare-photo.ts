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
  file: File,
  maxEdge: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = fittedSize(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not resize that photo.');
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not resize that photo.');
  return { blob, width: size.width, height: size.height };
}

export async function preparePhoto(file: File): Promise<UploadedPhoto> {
  const gps = await exifr.gps(file).catch(() => null);
  const lat = typeof gps?.latitude === 'number' ? gps.latitude : null;
  const lng = typeof gps?.longitude === 'number' ? gps.longitude : null;
  const located = lat != null && lng != null && isLatLng(lat, lng);
  const [resized, thumb] = await Promise.all([
    jpegBlob(file, PHOTO_MAX_EDGE),
    jpegBlob(file, PHOTO_THUMB_MAX_EDGE),
  ]);
  const photoId = crypto.randomUUID();
  const [stored, thumbStored] = await Promise.all([
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
