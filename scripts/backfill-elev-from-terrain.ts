/**
 * Re-estimate elev_gain_m for stored 2D routes using AWS Terrarium DEM + trackStats.
 *
 * Dry run (default):  npx tsx scripts/backfill-elev-from-terrain.ts
 * Apply:              npx tsx scripts/backfill-elev-from-terrain.ts --write
 * Tomvanz calibration: npx tsx scripts/backfill-elev-from-terrain.ts --calibrate
 * Member uploads only: npx tsx scripts/backfill-elev-from-terrain.ts --only-untrusted
 * Specific ids:        npx tsx scripts/backfill-elev-from-terrain.ts --ids=uuid1,uuid2
 */
import { sql } from 'drizzle-orm';
import { closeDb, getDb } from '@/db';
import {
  elevGainFromTerrainLine,
  TerrariumTileCache,
} from '@/lib/terrain/elev-from-line';
import { TOMVANZ_EXTERNAL_SOURCE } from '@/lib/tomvanz-sync/constants';

type QueryRows = { rows?: Record<string, unknown>[] };

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  return (result as QueryRows).rows ?? [];
}

function text(value: unknown): string | null {
  if (value == null) return null;
  const next = String(value);
  return next.length > 0 ? next : null;
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function args() {
  const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
  return {
    write: process.argv.includes('--write'),
    calibrate: process.argv.includes('--calibrate'),
    onlyUntrusted: process.argv.includes('--only-untrusted'),
    ids: idsArg ? idsArg.slice('--ids='.length).split(',').map((id) => id.trim()).filter(Boolean) : [],
  };
}

function pctError(estimate: number, actual: number | null): string {
  if (actual == null || actual === 0) return '—';
  const err = ((estimate - actual) / actual) * 100;
  const sign = err >= 0 ? '+' : '';
  return `${sign}${err.toFixed(1)}%`;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

async function main() {
  const { write, calibrate, onlyUntrusted, ids } = args();
  const db = getDb();
  const cache = new TerrariumTileCache({ diskDir: '/tmp/bannquet-terrain-tiles' });

  const idFilter =
    ids.length > 0
      ? sql`and t.id::text in (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``;

  const sourceFilter = calibrate
    ? sql`and t.external_source = ${TOMVANZ_EXTERNAL_SOURCE}`
    : onlyUntrusted
      ? sql`and t.external_source is null`
      : sql`and (t.external_source is null or t.external_source <> ${TOMVANZ_EXTERNAL_SOURCE})`;

  const rows = await db.execute(sql`
    select
      t.id::text as id,
      coalesce(t.title, t.name) as title,
      t.distance_m,
      t.elev_gain_m,
      t.external_source,
      ST_AsText(t.line::geometry) as line_wkt,
      u.handle as owner_handle
    from tracks t
    left join users u on u.id = t.user_id
    where ST_GeometryType(t.line::geometry) = 'ST_LineString'
      ${sourceFilter}
      ${idFilter}
    order by coalesce(t.title, t.name)
  `);

  const header = calibrate
    ? ['title', 'actual_m', 'estimate_m', 'error']
  : ['id', 'title', 'owner', 'dist_mi', 'old_gain', 'new_gain'];
  console.log(header.map((cell) => pad(cell, calibrate ? 14 : 12)).join('  '));

  let examined = 0;
  let updated = 0;

  for (const row of asRows(rows)) {
    const id = text(row.id);
    const lineWkt = text(row.line_wkt);
    const title = text(row.title) ?? '(untitled)';
    if (!id || !lineWkt) continue;
    examined += 1;

    const estimate = await elevGainFromTerrainLine(lineWkt, { cache });
    const oldGain = num(row.elev_gain_m);
    const distanceM = num(row.distance_m);

    if (calibrate) {
      console.log(
        [
          pad(title.slice(0, 36), 36),
          pad(oldGain == null ? '—' : String(oldGain), 10),
          pad(String(estimate), 12),
          pad(pctError(estimate, oldGain), 10),
        ].join('  '),
      );
      continue;
    }

    const distMi = distanceM == null ? '—' : (distanceM / 1609.344).toFixed(1);
    const owner = text(row.owner_handle) ?? '—';
    console.log(
      [
        pad(id.slice(0, 8), 10),
        pad(title.slice(0, 28), 30),
        pad(owner, 12),
        pad(distMi, 8),
        pad(oldGain == null ? '—' : String(oldGain), 10),
        pad(String(estimate), 10),
      ].join('  '),
    );

    if (write && estimate !== oldGain) {
      await db.execute(sql`
        update tracks set elev_gain_m = ${estimate}
        where id = ${id}::uuid
          and (elev_gain_m is distinct from ${estimate})
      `);
      updated += 1;
    }
  }

  console.log(`examined=${examined} updated=${updated} write=${write}`);
  if (calibrate) {
    console.log('Calibration uses tomvanz-sanity elev_gain_m (from GPX) as ground truth.');
  } else if (!write) {
    console.log('Dry run only. Pass --write to update elev_gain_m.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => closeDb());