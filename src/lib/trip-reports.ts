import { and, asc, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { photos, tripReports } from '@/db/schema';
import { isPostKind, type PostKind } from '@/lib/post-kinds';
import type { TripReportDetail, TripReportListItem, TripReportPhoto } from '@/types/trip-reports';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReportRow = {
  id: string;
  title: string;
  authorName: string | null;
  tripDate: string | null;
  activity: string | null;
  postKind: string | null;
  authorId: string | null;
  tags: string[] | null;
  body: string;
  legacySanityId: string | null;
  lat: number | null;
  lng: number | null;
};

function excerptFrom(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= 150) return flat;
  return `${flat.slice(0, 150).trimEnd()}...`;
}

function listItem(row: ReportRow, reportPhotos: TripReportPhoto[]): TripReportListItem {
  return {
    id: row.id,
    title: row.title,
    authorName: row.authorName || 'Unknown',
    tripDate: row.tripDate,
    activity: row.activity,
    postKind: row.postKind && isPostKind(row.postKind) ? row.postKind : 'trip_report',
    tags: row.tags ?? [],
    excerpt: excerptFrom(row.body),
    coverUrl: reportPhotos[0]?.url ?? null,
    photoCount: reportPhotos.length,
    legacySanityId: row.legacySanityId,
  };
}

async function photosByReport(ids: string[]): Promise<Map<string, TripReportPhoto[]>> {
  const grouped = new Map<string, TripReportPhoto[]>();
  if (ids.length === 0) return grouped;

  const rows = await getDb()
    .select({
      id: photos.id,
      tripReportId: photos.tripReportId,
      url: photos.blobUrl,
      caption: photos.caption,
      alt: photos.alt,
      width: photos.width,
      height: photos.height,
    })
    .from(photos)
    .where(inArray(photos.tripReportId, ids))
    .orderBy(asc(photos.sortOrder));

  for (const row of rows) {
    if (!row.tripReportId) continue;
    const list = grouped.get(row.tripReportId) ?? [];
    list.push({
      id: row.id,
      url: row.url,
      caption: row.caption,
      alt: row.alt,
      width: row.width,
      height: row.height,
    });
    grouped.set(row.tripReportId, list);
  }
  return grouped;
}

const reportColumns = {
  id: tripReports.id,
  title: tripReports.title,
  authorName: tripReports.legacyAuthorName,
  tripDate: tripReports.tripDate,
  activity: tripReports.activity,
  postKind: tripReports.postKind,
  authorId: tripReports.authorId,
  tags: tripReports.tags,
  body: tripReports.body,
  legacySanityId: tripReports.legacySanityId,
  lat: sql<number | null>`ST_Y(${tripReports.point}::geometry)`,
  lng: sql<number | null>`ST_X(${tripReports.point}::geometry)`,
};

export async function listTripReports(filters?: {
  authorName?: string | null;
  tag?: string | null;
  postKind?: PostKind | null;
  limit?: number | null;
}): Promise<TripReportListItem[]> {
  const conditions: SQL[] = [eq(tripReports.published, true)];
  if (filters?.authorName) {
    conditions.push(eq(tripReports.legacyAuthorName, filters.authorName));
  }
  if (filters?.tag) {
    conditions.push(sql`${filters.tag} = ANY(${tripReports.tags})`);
  }
  if (filters?.postKind) {
    conditions.push(eq(tripReports.postKind, filters.postKind));
  }

  const base = getDb()
    .select(reportColumns)
    .from(tripReports)
    .where(and(...conditions))
    .orderBy(desc(tripReports.tripDate), desc(tripReports.createdAt));

  const rows = filters?.limit && filters.limit > 0 ? await base.limit(filters.limit) : await base;
  const photoMap = await photosByReport(rows.map((row) => row.id));
  return rows.map((row) => listItem(row, photoMap.get(row.id) ?? []));
}

export async function getTripReport(id: string): Promise<TripReportDetail | null> {
  const where = UUID_PATTERN.test(id)
    ? or(eq(tripReports.id, id), eq(tripReports.legacySanityId, id))
    : eq(tripReports.legacySanityId, id);

  const [row] = await getDb()
    .select(reportColumns)
    .from(tripReports)
    .where(and(eq(tripReports.published, true), where))
    .limit(1);

  if (!row) return null;
  const photoMap = await photosByReport([row.id]);
  const reportPhotos = photoMap.get(row.id) ?? [];
  return {
    ...listItem(row, reportPhotos),
    body: row.body,
    authorId: row.authorId,
    lat: row.lat,
    lng: row.lng,
    photos: reportPhotos,
  };
}

export async function getEditablePost(id: string): Promise<{
  id: string;
  authorId: string | null;
  title: string;
  body: string;
  tripDate: string | null;
  activity: string | null;
  postKind: PostKind;
} | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const [row] = await getDb()
    .select({
      id: tripReports.id,
      authorId: tripReports.authorId,
      title: tripReports.title,
      body: tripReports.body,
      tripDate: tripReports.tripDate,
      activity: tripReports.activity,
      postKind: tripReports.postKind,
    })
    .from(tripReports)
    .where(and(eq(tripReports.published, true), eq(tripReports.id, id)))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    postKind: isPostKind(row.postKind) ? row.postKind : 'trip_report',
  };
}
