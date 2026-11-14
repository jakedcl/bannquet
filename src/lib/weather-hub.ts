import {
  MOUNTAIN_STATES,
  mountainStateSlug,
  summitOfSection,
  type MountainSection,
} from '@/lib/mountain-weather/places';
import { hubGlanceFromBaseline, type HubGlance } from '@/lib/mountain-weather/hub-glance';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';

const POOL = 4;

export type RegionGlance = HubGlance & { id: string };
export type StateGlance = {
  code: MountainStateCode;
  slug: string;
  name: string;
  href: string;
  regions: RegionGlance[];
};

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

async function loadSectionGlance(
  stateCode: MountainStateCode,
  section: MountainSection,
  now: Date,
): Promise<RegionGlance> {
  const slug = mountainStateSlug(stateCode);
  const href = `/mountain-weather/${slug}/${section.id}`;
  const representative = summitOfSection(section);
  if (!representative) {
    return {
      id: section.id,
      title: section.title,
      href,
      icon: null,
      high: null,
      low: null,
      precip: null,
      wind: null,
      phrase: 'Forecast unavailable',
      alert: null,
    };
  }
  const result = await readNwsGridBaseline(representative);
  const glance = hubGlanceFromBaseline(result, { title: section.title, href }, now);
  return { id: section.id, ...glance };
}

export async function loadWeatherHub(now = new Date()): Promise<StateGlance[]> {
  const jobs = MOUNTAIN_STATES.flatMap((state) =>
    state.sections.map((section) => ({ code: state.code, section })),
  );
  const regions = await mapPool(jobs, POOL, (job) => loadSectionGlance(job.code, job.section, now));
  let cursor = 0;
  return MOUNTAIN_STATES.map((state) => {
    const count = state.sections.length;
    const slice = regions.slice(cursor, cursor + count);
    cursor += count;
    return {
      code: state.code,
      slug: mountainStateSlug(state.code),
      name: state.name,
      href: mountainWeatherPath(state.code),
      regions: slice,
    };
  });
}

export async function loadStateSectionGlances(
  stateCode: MountainStateCode,
  now = new Date(),
): Promise<RegionGlance[]> {
  const state = MOUNTAIN_STATES.find((entry) => entry.code === stateCode);
  if (!state) return [];
  return mapPool(state.sections, POOL, (section) => loadSectionGlance(stateCode, section, now));
}

export async function loadPlaceGlances(
  stateCode: MountainStateCode,
  sectionId: string,
  now = new Date(),
): Promise<HubGlance[]> {
  const state = MOUNTAIN_STATES.find((entry) => entry.code === stateCode);
  const section = state?.sections.find((entry) => entry.id === sectionId);
  if (!section) return [];
  return mapPool(section.places, POOL, async (place) => {
    const result = await readNwsGridBaseline(place);
    const href = mountainWeatherPath(stateCode, sectionId, place.id);
    return hubGlanceFromBaseline(result, { title: place.name, href }, now);
  });
}

export async function loadAllPlaceGlancesForState(
  stateCode: MountainStateCode,
  now = new Date(),
): Promise<HubGlance[]> {
  const state = MOUNTAIN_STATES.find((entry) => entry.code === stateCode);
  if (!state) return [];
  const jobs = state.sections.flatMap((section) =>
    section.places.map((place) => ({ sectionId: section.id, place })),
  );
  return mapPool(jobs, POOL, async ({ sectionId, place }) => {
    const result = await readNwsGridBaseline(place);
    const href = mountainWeatherPath(stateCode, sectionId, place.id);
    return hubGlanceFromBaseline(result, { title: place.name, href }, now);
  });
}
