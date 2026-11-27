import { put } from '@vercel/blob';
import { PHOTO_MAX_EDGE, PHOTO_THUMB_MAX_EDGE, jpegDimensions } from '@/lib/photos';
import { photoBlobPath, sanityImageDownloadUrl } from './map';

export type UploadedPhotoUrls = {
  blobUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
};

export async function uploadTomvanzPhoto(
  assetRef: string,
  imageHash: string,
  dryRun: boolean,
): Promise<UploadedPhotoUrls> {
  const fullSource = sanityImageDownloadUrl(assetRef, PHOTO_MAX_EDGE, 85);
  const thumbSource = sanityImageDownloadUrl(assetRef, PHOTO_THUMB_MAX_EDGE, 80);
  if (!fullSource || !thumbSource) throw new Error('Could not build Sanity image URLs.');

  const fullPath = photoBlobPath(imageHash, false);
  const thumbPath = photoBlobPath(imageHash, true);

  if (dryRun) {
    return {
      blobUrl: `https://dry-run.local/${fullPath}`,
      thumbUrl: `https://dry-run.local/${thumbPath}`,
      width: 0,
      height: 0,
    };
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set.');

  const [fullRes, thumbRes] = await Promise.all([fetch(fullSource), fetch(thumbSource)]);
  if (!fullRes.ok) throw new Error(`Sanity full image fetch failed (${fullRes.status}).`);
  if (!thumbRes.ok) throw new Error(`Sanity thumb image fetch failed (${thumbRes.status}).`);

  const [fullBytes, thumbBytes] = await Promise.all([
    fullRes.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
    thumbRes.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
  ]);
  const size = jpegDimensions(fullBytes);
  if (!size) throw new Error('Could not read dimensions of the stored JPEG.');

  const [fullBlob, thumbBlob] = await Promise.all([
    put(fullPath, Buffer.from(fullBytes), { access: 'public', token, allowOverwrite: true, contentType: 'image/jpeg' }),
    put(thumbPath, Buffer.from(thumbBytes), { access: 'public', token, allowOverwrite: true, contentType: 'image/jpeg' }),
  ]);

  return { blobUrl: fullBlob.url, thumbUrl: thumbBlob.url, width: size.width, height: size.height };
}
