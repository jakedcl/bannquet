import { put } from '@vercel/blob';
import { photoBlobPath, sanityImageDownloadUrl } from './map';

export type UploadedPhotoUrls = { blobUrl: string; thumbUrl: string };

export async function uploadTomvanzPhoto(
  assetRef: string,
  imageHash: string,
  dryRun: boolean,
): Promise<UploadedPhotoUrls> {
  const fullSource = sanityImageDownloadUrl(assetRef, 2000, 85);
  const thumbSource = sanityImageDownloadUrl(assetRef, 480, 80);
  if (!fullSource || !thumbSource) throw new Error('Could not build Sanity image URLs.');

  const fullPath = photoBlobPath(imageHash, false);
  const thumbPath = photoBlobPath(imageHash, true);

  if (dryRun) {
    return {
      blobUrl: `https://dry-run.local/${fullPath}`,
      thumbUrl: `https://dry-run.local/${thumbPath}`,
    };
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not set.');

  const [fullRes, thumbRes] = await Promise.all([fetch(fullSource), fetch(thumbSource)]);
  if (!fullRes.ok) throw new Error(`Sanity full image fetch failed (${fullRes.status}).`);
  if (!thumbRes.ok) throw new Error(`Sanity thumb image fetch failed (${thumbRes.status}).`);

  const [fullBlob, thumbBlob] = await Promise.all([
    put(fullPath, await fullRes.blob(), { access: 'public', token, allowOverwrite: true }),
    put(thumbPath, await thumbRes.blob(), { access: 'public', token, allowOverwrite: true }),
  ]);

  return { blobUrl: fullBlob.url, thumbUrl: thumbBlob.url };
}