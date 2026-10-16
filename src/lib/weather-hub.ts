import { REGION_OPTIONS, REGION_WEATHER_SECTIONS, type WeatherSection, type WeatherSpot } from '@/lib/regions';
import {
  alertLabel,
  glancePhrase,
  maxGustMph,
  maxPrecip,
  maxSustainedMph,
  parseMph,
  summitHighLow,
  windLabel,
  type GlancePeriod,
} from '@/lib/weather-glance';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';
const REVALIDATE_SECONDS = 900;
const POOL = 4;

const STATE_NAMES: Record<string, string> = {
  ny: 'New York',
  vt: 'Vermont',
  nh: 'New Hampshire',
  me: 'Maine',
};

export type RegionGlance = {
  id: string;
  title: string;
  href: string;
  icon: string | null;
  high: number | null;
  low: number | null;
  precip: number | null;
  wind: string | null;
  phrase: string;
  alert: string | null;
};

export type StateGlance = {
  code: string;
  name: string;
  href: string;
  regions: RegionGlance[];
};

type PointResponse = {
  properties?: {
    forecast?: string;
    gridId?: string;
    gridX?: number;
    gridY?: number;
  };
};

type NwsPeriod = {
  name?: string;
  startTime?: string;
  endTime?: string;
  isDaytime?: boolean;
  temperature?: number;
  windSpeed?: string;
  icon?: string;
  shortForecast?: string;
  probabilityOfPrecipitation?: { value?: number | null };
};

type ForecastResponse = {
  properties?: {
    periods?: NwsPeriod[];
  };
};

type GridResponse = {
  properties?: {
    windGust?: {
      uom?: string;
      values?: { validTime?: string; value?: number | null }[];
    };
  };
};

type AlertResponse = {
  features?: { properties?: { event?: string; severity?: string } }[];
};

function summitOf(section: WeatherSection): WeatherSpot | null {
  if (section.spots.length === 0) return null;
  const summits = section.spots.filter((spot) => spot.kind === 'summit');
  const pool = summits.length > 0 ? summits : section.spots;
  return pool.reduce((best, spot) => (spot.elevation > best.elevation ? spot : best));
}

async function nws<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/geo+json',
    },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`NWS ${response.status}`);
  return response.json() as Promise<T>;
}

function toGlance(period: NwsPeriod): GlancePeriod | null {
  if (!period?.name || !period.startTime || !period.endTime || typeof period.temperature !== 'number') return null;
  return {
    name: period.name,
    startTime: period.startTime,
    endTime: period.endTime,
    temperature: period.temperature,
    isDaytime: Boolean(period.isDaytime),
    precip: period.probabilityOfPrecipitation?.value ?? null,
    windMph: parseMph(period.windSpeed),
    shortForecast: period.shortForecast ?? '',
    icon: period.icon ?? null,
  };
}

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

async function loadRegion(code: string, section: WeatherSection, now: Date): Promise<RegionGlance> {
  const href = `/mountain-weather?state=${code}#${section.id}`;
  const blank: RegionGlance = {
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
  const spot = summitOf(section);
  if (!spot) return blank;
  try {
    const point = await nws<PointResponse>(`https://api.weather.gov/points/${spot.lat.toFixed(4)},${spot.lon.toFixed(4)}`);
    const forecastUrl = point.properties?.forecast;
    const gridId = point.properties?.gridId;
    const gridX = point.properties?.gridX;
    const gridY = point.properties?.gridY;
    if (!forecastUrl || !gridId || gridX == null || gridY == null) return blank;
    const [forecast, grid, alerts] = await Promise.all([
      nws<ForecastResponse>(forecastUrl),
      nws<GridResponse>(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}`).catch(() => null),
      nws<AlertResponse>(`https://api.weather.gov/alerts/active?point=${spot.lat.toFixed(4)},${spot.lon.toFixed(4)}`).catch(() => null),
    ]);
    const periods = (forecast.properties?.periods ?? []).flatMap((period) => {
      const glance = toGlance(period);
      return glance ? [glance] : [];
    }).slice(0, 8);
    const alert = alertLabel((alerts?.features ?? []).map((feature) => feature.properties ?? {}));
    if (periods.length === 0) return { ...blank, alert };
    const gust = maxGustMph(grid?.properties?.windGust?.values, grid?.properties?.windGust?.uom, now);
    const { high, low } = summitHighLow(periods);
    return {
      id: section.id,
      title: section.title,
      href,
      icon: periods[0].icon,
      high,
      low,
      precip: maxPrecip(periods, now),
      wind: windLabel(gust, maxSustainedMph(periods, now)),
      phrase: glancePhrase({ periods, maxGustMph: gust, now }),
      alert,
    };
  } catch (error) {
    console.error(`Weather hub ${section.id} did not load`, error);
    return blank;
  }
}

export async function loadWeatherHub(now = new Date()): Promise<StateGlance[]> {
  const jobs = REGION_OPTIONS.flatMap((option) => {
    const sections = REGION_WEATHER_SECTIONS[option.code] ?? [];
    return sections.map((section) => ({ code: option.code, section }));
  });
  const regions = await mapPool(jobs, POOL, (job) => loadRegion(job.code, job.section, now));
  let cursor = 0;
  return REGION_OPTIONS.map((option) => {
    const count = (REGION_WEATHER_SECTIONS[option.code] ?? []).length;
    const slice = regions.slice(cursor, cursor + count);
    cursor += count;
    return {
      code: option.code,
      name: STATE_NAMES[option.code] ?? option.label,
      href: `/mountain-weather?state=${option.code}`,
      regions: slice,
    };
  });
}
