/**
 * Generate Blob thumbnails for photos missing thumb_url.
 *
 *   npx tsx scripts/backfill-photo-thumbs.ts --dry-run
 *   CONFIRM_THUMB_BACKFILL=yes npx tsx scripts/backfill-photo-thumbs.ts
 */
import 'dotenv/config';
import { put } from '@vercel/blob';
import { Pool } from 'pg';
import sharp from 'sharp';
import { fittedSize, PHOTO_JPEG_QUALITY, PHOTO_THUMB_MAX_EDGE } from '../src/lib/photos';

const dryRun = process.argv.includes('--dry-run');

function thumbPathFor(blobUrl: string, id: string): string {
  try {
    const pathname = new URL(blobUrl).pathname;
    const match = /\/([^/]+)\.jpg$/i.exec(pathname);
    if (match) {
      return `photos/${match[1]}-thumb.jpg`;
    }
  } catch {
    // fall through
  }
  return `photos/${id}-thumb.jpg`;
}

async function main(): Promise<void> {
  if (!dryRun && process.env.CONFIRM_THUMB_BACKFILL !== 'yes') {
    console.error('Pass --dry-run, or set CONFIRM_THUMB_BACKFILL=yes to write.');
    process.exit(1);
  }
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL or DATABASE_URL_UNPOOLED is required.');
    process.exit(1);
  }
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is required to upload thumbs.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const { rows } = await pool.query<{ id: string; blob_url: string }>(`
    select id::text as id, blob_url
    from photos
    where thumb_url is null
    order by created_at asc
  `);

  console.log(`${dryRun ? '[dry-run] ' : ''}${rows.length} photo(s) without thumb_url`);

  let updated = 0;
  for (const row of rows) {
    const path = thumbPathFor(row.blob_url, row.id);
    if (dryRun) {
      console.log(`  ${row.id} -> ${path}`);
      continue;
    }

    const response = await fetch(row.blob_url);
    if (!response.ok) {
      console.error(`  skip ${row.id}: download failed (${response.status})`);
      continue;
    }

    const source = Buffer.from(await response.arrayBuffer());
    const meta = await sharp(source).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 1 || height < 1) {
      console.error(`  skip ${row.id}: invalid dimensions`);
      continue;
    }
    const size = fittedSize(width, height, PHOTO_THUMB_MAX_EDGE);
    const thumb = await sharp(source)
      .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: Math.round(PHOTO_JPEG_QUALITY * 100) })
      .toBuffer();

    const stored = await put(path, thumb, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
    });

    await pool.query('update photos set thumb_url = $1 where id = $2::uuid', [stored.url, row.id]);
    updated += 1;
    console.log(`  updated ${row.id}`);
  }

  await pool.end();
  if (!dryRun) {
    console.log(`Done. Wrote ${updated} thumbnail(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
