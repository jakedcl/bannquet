/**
 * One-off import of Sanity `tripReport` documents into Postgres.
 *
 * Does not run during `next build`. Refuses to write unless
 * CONFIRM_SANITY_MIGRATION=yes, and refuses to run on Vercel.
 *
 *   npm run db:migrate-sanity -- --dry-run
 *   CONFIRM_SANITY_MIGRATION=yes npm run db:migrate-sanity
 *
 * Apply `npm run db:migrate` against a Neon branch before the real import.
 */
import { config as loadEnv } from 'dotenv';
import { put } from '@vercel/blob';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { photos, pins, tripReports } from '../src/db/schema';
import { portableTextToPlainText, sanityAssetUrl } from '../src/lib/portable-text';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

type SanityReport = {
  _id?: string;
  _createdAt?: string;
  _updatedAt?: string;
  title?: string;
  authorName?: string;
  authorEmail?: string;
  tripDate?: string;
  locationPin?: { lat?: number; lng?: number } | null;
  body?: unknown;
  tags?: unknown;
  published?: boolean;
  publishedAt?: string;
};

const dryRun = process.argv.includes('--dry-run');

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function databaseHost(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
}

function asDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function finiteCoord(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function fetchReports(): Promise<SanityReport[]> {
  const projectId = required('SANITY_PROJECT_ID');
  const dataset = process.env.SANITY_DATASET || 'production';
  const apiVersion = process.env.SANITY_API_VERSION || '2024-01-01';
  const token = required('SANITY_API_TOKEN');
  const query = `*[_type == "tripReport"]{
    _id, _createdAt, _updatedAt, title, authorName, authorEmail, tripDate,
    locationPin, body, tags, published, publishedAt
  }`;
  const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`);
  url.searchParams.set('query', query);
  url.searchParams.set('perspective', 'raw');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sanity query failed (${response.status}): ${body.slice(0, 300)}`);
  }
  const payload = (await response.json()) as { result?: SanityReport[] };
  return Array.isArray(payload.result) ? payload.result : [];
}

async function storeImage(options: {
  projectId: string;
  dataset: string;
  assetRef: string;
  reportKey: string;
  existingUrl: string | null;
}): Promise<{ url: string; width: number | null; height: number | null; copied: boolean }> {
  const asset = sanityAssetUrl(options.projectId, options.dataset, options.assetRef);
  if (!asset) {
    throw new Error(`Could not parse Sanity asset ${options.assetRef}`);
  }
  if (options.existingUrl && !options.existingUrl.includes('cdn.sanity.io')) {
    return { url: options.existingUrl, width: asset.width, height: asset.height, copied: false };
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return { url: asset.url, width: asset.width, height: asset.height, copied: false };
  }

  const image = await fetch(asset.url);
  if (!image.ok) {
    throw new Error(`Image download failed (${image.status}) for ${asset.url}`);
  }
  const bytes = Buffer.from(await image.arrayBuffer());
  const blob = await put(`trip-reports/${options.reportKey}/${asset.filename}`, bytes, {
    access: 'public',
    contentType: image.headers.get('content-type') ?? 'application/octet-stream',
    token,
  });
  return { url: blob.url, width: asset.width, height: asset.height, copied: true };
}

async function main() {
  if (process.env.VERCEL) {
    throw new Error('This import is local-only. Do not run it in a Vercel build.');
  }

  const reports = await fetchReports();
  console.log(`Fetched ${reports.length} Sanity trip reports.`);

  if (dryRun) {
    const sample = reports[0];
    if (sample) {
      const converted = portableTextToPlainText(sample.body);
      console.log('Dry run sample:', sample.title ?? sample._id);
      console.log(converted.text.slice(0, 500) || '(empty body)');
      console.log(`Images in sample: ${converted.images.length}`);
    }
    console.log('Dry run only. No database writes.');
    return;
  }

  if (process.env.CONFIRM_SANITY_MIGRATION !== 'yes') {
    throw new Error(
      'Refusing to write. Set CONFIRM_SANITY_MIGRATION=yes after pointing DATABASE_URL at a Neon branch, not production.',
    );
  }

  const databaseUrl = required('DATABASE_URL');
  console.log(`Writing to ${databaseHost(databaseUrl)}`);

  const projectId = required('SANITY_PROJECT_ID');
  const dataset = process.env.SANITY_DATASET || 'production';
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  const db = drizzle(pool);
  const summary = {
    reports: 0,
    photosCopied: 0,
    photosLinked: 0,
    pins: 0,
    failed: 0,
  };

  try {
    for (const report of reports) {
      const legacyId = report._id;
      const title = report.title?.trim();
      if (!legacyId || !title) {
        summary.failed += 1;
        console.error('Skipping a report with no _id or title.');
        continue;
      }

      try {
        const converted = portableTextToPlainText(report.body);
        const lat = finiteCoord(report.locationPin?.lat);
        const lng = finiteCoord(report.locationPin?.lng);
        const point = lat != null && lng != null
          ? sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`
          : null;

        const [saved] = await db
          .insert(tripReports)
          .values({
            title,
            body: converted.text,
            legacyAuthorName: report.authorName ?? null,
            legacyAuthorEmail: report.authorEmail ?? null,
            tripDate: asDate(report.tripDate),
            tags: asTags(report.tags),
            legacySanityId: legacyId,
            published: report.published === true,
            point,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: tripReports.legacySanityId,
            set: {
              title,
              body: converted.text,
              legacyAuthorName: report.authorName ?? null,
              legacyAuthorEmail: report.authorEmail ?? null,
              tripDate: asDate(report.tripDate),
              tags: asTags(report.tags),
              published: report.published === true,
              point,
              updatedAt: new Date(),
            },
          })
          .returning({ id: tripReports.id });

        const existingPhotos = await db
          .select({
            id: photos.id,
            assetId: photos.legacySanityAssetId,
            url: photos.blobUrl,
          })
          .from(photos)
          .where(eq(photos.tripReportId, saved.id));
        const existingByAsset = new Map(
          existingPhotos
            .filter((photo) => photo.assetId)
            .map((photo) => [photo.assetId as string, photo]),
        );
        const seen = new Set<string>();

        for (const [index, image] of converted.images.entries()) {
          if (!image.assetRef) {
            console.error(`${legacyId}: image ${index} has no asset ref`);
            continue;
          }
          seen.add(image.assetRef);
          const existing = existingByAsset.get(image.assetRef);
          const stored = await storeImage({
            projectId,
            dataset,
            assetRef: image.assetRef,
            reportKey: legacyId.replace(/[^a-zA-Z0-9_-]/g, '_'),
            existingUrl: existing?.url ?? null,
          });
          if (stored.copied) summary.photosCopied += 1;
          else summary.photosLinked += 1;

          if (existing) {
            await db
              .update(photos)
              .set({
                blobUrl: stored.url,
                width: stored.width,
                height: stored.height,
                caption: image.caption,
                alt: image.alt,
                sortOrder: index,
              })
              .where(eq(photos.id, existing.id));
          } else {
            await db.insert(photos).values({
              tripReportId: saved.id,
              blobUrl: stored.url,
              width: stored.width,
              height: stored.height,
              caption: image.caption,
              alt: image.alt,
              legacySanityAssetId: image.assetRef,
              sortOrder: index,
            });
          }
        }

        for (const photo of existingPhotos) {
          if (photo.assetId && !seen.has(photo.assetId)) {
            await db.delete(photos).where(eq(photos.id, photo.id));
          }
        }

        await db.delete(pins).where(eq(pins.tripReportId, saved.id));
        if (point) {
          await db.insert(pins).values({
            kind: 'other',
            title,
            note: 'Imported from a trip report',
            tripReportId: saved.id,
            point,
          });
          summary.pins += 1;
        }

        summary.reports += 1;
      } catch (error) {
        summary.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
        if (code === '42P01' || message.includes('trip_reports')) {
          throw new Error('trip_reports is missing. Run npm run db:migrate on this database first.');
        }
        console.error(`Failed ${legacyId}: ${message}`);
      }
    }
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
