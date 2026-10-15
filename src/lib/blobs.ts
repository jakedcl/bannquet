import { del } from '@vercel/blob';
import { isPublicBlobUrl } from '@/lib/photos';

export async function removeBlobs(urls: string[]): Promise<void> {
  const blobs = [...new Set(urls.filter((url) => isPublicBlobUrl(url)))];
  if (blobs.length === 0) return;
  try {
    await del(blobs);
  } catch {
    // The row is still removed so the map drops the photo. A missing token should not keep the pin.
  }
}
