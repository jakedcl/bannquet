import { del } from '@vercel/blob';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
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

/** Delete photo files (full and thumb) after their rows are gone, keeping any file another photo row still uses. */
export async function removePhotoFiles(urls: Array<string | null | undefined>): Promise<void> {
  const files = [...new Set(urls.filter((url): url is string => typeof url === 'string' && isPublicBlobUrl(url)))];
  if (files.length === 0) return;
  let inUse = new Set<string>();
  try {
    const result = await getDb().execute(sql`
      select blob_url, thumb_url from photos
      where blob_url in ${files} or thumb_url in ${files}
    `);
    const rows = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? [];
    inUse = new Set(rows.flatMap((row) => [row.blob_url, row.thumb_url]).filter((url): url is string => typeof url === 'string'));
  } catch {
    return;
  }
  await removeBlobs(files.filter((url) => !inUse.has(url)));
}
