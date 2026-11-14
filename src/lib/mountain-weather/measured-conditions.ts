import { MOUNTAIN_STATES } from '@/lib/mountain-weather/places';
import { hubGlanceFromBaseline, type HubGlance } from '@/lib/mountain-weather/hub-glance';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';
import { readNwsStationLatest } from '@/lib/mountain-weather/readers/nws-station';
import { visibleStationBindings } from '@/lib/mountain-weather/station-bindings';
import { stationMeasuredScalars } from '@/lib/mountain-weather/station-scalars';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';

const POOL = 4;

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }
  const workers = Math.min(limit, items.length);
  if (workers === 0) return results;
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export type MeasuredConditionSpot = {
  placeId: string;
  mountain: string;
  state: string;
  href: string;
  stationId: string;
  stationName: string | null;
  observedAt: string | null;
  ageMinutes: number | null;
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  windChill: number;
  windSpeed: number;
  windGust: number;
};

export type MountainConditionsReport = {
  success: boolean;
  spots: MeasuredConditionSpot[];
  glances: HubGlance[];
  error?: string;
  attempted: number;
  succeeded: number;
  failed: number;
};

function primaryBinding(placeId: string) {
  const visible = visibleStationBindings(placeId);
  return visible.find((row) => row.kind === 'summit') ?? visible[0] ?? null;
}

export async function loadMountainConditionsReport(now = new Date()): Promise<MountainConditionsReport> {
  const jobs = MOUNTAIN_STATES.flatMap((state) =>
    state.sections.flatMap((section) =>
      section.places.map((place) => ({
        stateCode: state.code as MountainStateCode,
        stateName: state.name,
        sectionId: section.id,
        place,
      })),
    ),
  );

  const stationIds = new Set<string>();
  for (const job of jobs) {
    const binding = primaryBinding(job.place.id);
    if (binding) stationIds.add(binding.stationId);
  }

  const stationResults = new Map(
    await mapPool([...stationIds], POOL, async (stationId) => {
      const result = await readNwsStationLatest(stationId);
      return [stationId, result] as const;
    }),
  );

  const glances = await mapPool(jobs, POOL, async (job) => {
    const baseline = await readNwsGridBaseline(job.place);
    const href = mountainWeatherPath(job.stateCode, job.sectionId, job.place.id);
    return hubGlanceFromBaseline(baseline, { title: job.place.name, href }, now);
  });

  const failures: string[] = [];
  const spots: MeasuredConditionSpot[] = [];

  for (const job of jobs) {
    const binding = primaryBinding(job.place.id);
    if (!binding) continue;
    const result = stationResults.get(binding.stationId);
    if (!result || result.status !== 'ok' || !result.data) {
      failures.push(`${job.place.name}: ${result?.error ?? 'no station data'}`);
      continue;
    }
    const scalars = stationMeasuredScalars(result.data);
    if (scalars.tempF === null) {
      failures.push(`${job.place.name}: missing temperature`);
      continue;
    }
    const temp = scalars.tempF;
    const wind = scalars.windMph ?? 0;
    const gust = scalars.gustMph ?? wind;
    const chill = scalars.windChillF ?? temp;
    spots.push({
      placeId: job.place.id,
      mountain: job.place.name,
      state: job.stateName,
      href: mountainWeatherPath(job.stateCode, job.sectionId, job.place.id),
      stationId: binding.stationId,
      stationName: binding.stationName,
      observedAt: scalars.observedAt,
      ageMinutes: scalars.ageMinutes,
      temperature: temp,
      minTemperature: temp,
      maxTemperature: temp,
      windChill: chill,
      windSpeed: wind,
      windGust: gust,
    });
  }

  if (spots.length === 0) {
    return {
      success: false,
      spots: [],
      glances,
      error: failures[0] ?? 'No measured station results',
      attempted: jobs.length,
      succeeded: 0,
      failed: failures.length,
    };
  }

  return {
    success: true,
    spots,
    glances,
    attempted: jobs.length,
    succeeded: spots.length,
    failed: failures.length,
  };
}