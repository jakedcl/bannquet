import { REGION_LABELS, REGION_WEATHER_SECTIONS } from '@/lib/regions';

export type ExtremeStat = {
  label: string;
  value: string;
  location: string;
};

export type ExtremeSpot = {
  mountain: string;
  state: string;
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  windChill: number;
  windSpeed: number;
  windGust: number;
  isSnowing: boolean;
};

export type ExtremeReport = {
  success: boolean;
  stats: ExtremeStat[];
  spots: ExtremeSpot[];
  error?: string;
  attempted: number;
  succeeded: number;
  failed: number;
};

export function extremeStatsFromSpots(results: ExtremeSpot[]): ExtremeStat[] {
  if (results.length === 0) return [];

  const highestWind = results.reduce((max, curr) =>
    curr.windGust > max.windGust ? curr : max, results[0]);
  const highestTemp = results.reduce((max, curr) =>
    curr.maxTemperature > max.maxTemperature ? curr : max, results[0]);
  const lowestTemp = results.reduce((min, curr) =>
    curr.minTemperature < min.minTemperature ? curr : min, results[0]);
  const lowestWindChill = results.reduce((min, curr) =>
    curr.windChill < min.windChill ? curr : min, results[0]);

  const snowingLocations = results.filter((spot) => spot.isSnowing);
  const snowingNames = snowingLocations.map((spot) => spot.mountain);
  const snowingPreview = snowingNames.length <= 3
    ? snowingNames.join(', ')
    : `${snowingNames.slice(0, 3).join(', ')} +${snowingNames.length - 3} more`;

  return [
    {
      label: 'HIGHEST WIND',
      value: `${highestWind.windGust}mph`,
      location: `${highestWind.mountain}, ${highestWind.state}`,
    },
    {
      label: 'HIGHEST TEMP',
      value: `${highestTemp.maxTemperature}°F`,
      location: `${highestTemp.mountain}, ${highestTemp.state}`,
    },
    {
      label: 'LOWEST TEMP',
      value: `${lowestTemp.minTemperature}°F`,
      location: `${lowestTemp.mountain}, ${lowestTemp.state}`,
    },
    {
      label: 'LOWEST WIND CHILL',
      value: `${lowestWindChill.windChill}°F`,
      location: `${lowestWindChill.mountain}, ${lowestWindChill.state}`,
    },
    ...(snowingLocations.length > 0 ? [{
      label: 'SNOWING NOW',
      value: snowingPreview,
      location: snowingLocations[0].state,
    }] : []),
  ];
}

export async function loadWeatherExtremes(): Promise<ExtremeReport> {
  try {
    const allMountains: Array<{
      name: string;
      state: string;
      lat: number;
      lon: number;
      priority: number;
    }> = [];

    Object.keys(REGION_WEATHER_SECTIONS).forEach((region) => {
      const sections = REGION_WEATHER_SECTIONS[region];
      sections.forEach((section) => {
        section.spots.forEach((spot) => {
          const priority = spot.kind === 'summit' ? 0
            : spot.kind === 'notch' || spot.kind === 'crag' || spot.kind === 'park' ? 1
            : 2;
          allMountains.push({
            name: spot.name,
            state: REGION_LABELS[region] || region.toUpperCase(),
            lat: spot.lat,
            lon: spot.lon,
            priority,
          });
        });
      });
    });

    const mountains = allMountains
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 12);

    const failures: Array<{ mountain: string; error: string }> = [];
    const results: ExtremeSpot[] = [];
    const batchSize = 4;
    for (let i = 0; i < mountains.length; i += batchSize) {
      const batch = mountains.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map(async (mountain) => {
          const weather = await getExtremeWeatherSnapshot(mountain.lat, mountain.lon);
          const windSpeedNum = parseWindNumber(weather.windSpeed);
          const windGustNum = parseWindNumber(weather.windGust);
          const currentTemp = weather.temperature || 0;
          const windChill = computeWindChill(currentTemp, windSpeedNum);
          const hourlyTemps = weather.hourlyTemps;
          const minTemp = hourlyTemps.length > 0
            ? Math.min(...hourlyTemps, currentTemp)
            : currentTemp;
          const maxTemp = hourlyTemps.length > 0
            ? Math.max(...hourlyTemps, currentTemp)
            : currentTemp;

          return {
            mountain: mountain.name,
            state: mountain.state,
            temperature: currentTemp,
            minTemperature: minTemp,
            maxTemperature: maxTemp,
            windChill: Math.round(windChill),
            windSpeed: windSpeedNum,
            windGust: windGustNum,
            isSnowing: weather.precipitation > 50 && currentTemp < 32,
          };
        }),
      );

      settled.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          return;
        }
        failures.push({
          mountain: batch[idx]?.name ?? 'Unknown',
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      });
    }

    if (results.length === 0) {
      console.error('Weather extremes: no results', {
        attempted: allMountains.length,
        failures: failures.slice(0, 3),
      });
      return {
        success: false,
        stats: [],
        spots: [],
        error: 'NWS unavailable (no mountain results)',
        attempted: mountains.length,
        failed: failures.length,
        succeeded: 0,
      };
    }

    return {
      success: true,
      stats: extremeStatsFromSpots(results),
      spots: results,
      attempted: mountains.length,
      succeeded: results.length,
      failed: failures.length,
    };
  } catch (error) {
    console.error('Error fetching weather extremes:', error);
    return {
      success: false,
      stats: [],
      spots: [],
      error: 'Failed to fetch weather data',
      attempted: 0,
      succeeded: 0,
      failed: 0,
    };
  }
}

function parseWindNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type NwsPointResponse = {
  properties?: {
    forecastHourly?: string;
  };
};

type NwsHourlyPeriod = {
  temperature?: number;
  windSpeed?: string;
  probabilityOfPrecipitation?: { value?: number | null };
};

type NwsHourlyResponse = {
  properties?: {
    periods?: NwsHourlyPeriod[];
  };
};

async function fetchNwsJson<T>(url: string, timeoutMs = 4500): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bannquet-Weather-App (admin@bannquet.com)',
        Accept: 'application/geo+json',
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`NWS ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

async function getExtremeWeatherSnapshot(lat: number, lon: number) {
  const pointData = await fetchNwsJson<NwsPointResponse>(`https://api.weather.gov/points/${lat},${lon}`);
  const forecastHourly = pointData.properties?.forecastHourly;
  if (!forecastHourly) {
    throw new Error('NWS points missing forecastHourly');
  }

  const hourlyData = await fetchNwsJson<NwsHourlyResponse>(forecastHourly);
  const periods = Array.isArray(hourlyData.properties?.periods) ? hourlyData.properties?.periods : [];
  const currentPeriod = periods[0];
  if (!currentPeriod) {
    throw new Error('NWS hourly forecast missing periods');
  }

  const hourlyTemps = periods
    .slice(0, 24)
    .map((period) => period.temperature)
    .filter((temp): temp is number => typeof temp === 'number');

  return {
    temperature: typeof currentPeriod.temperature === 'number' ? currentPeriod.temperature : 0,
    windSpeed: currentPeriod.windSpeed ?? '0 mph',
    windGust: currentPeriod.windSpeed ?? '0 mph',
    precipitation: currentPeriod.probabilityOfPrecipitation?.value ?? 0,
    hourlyTemps,
  };
}

function computeWindChill(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph <= 3) {
    return tempF;
  }
  return 35.74 + (0.6215 * tempF) - (35.75 * Math.pow(windMph, 0.16)) + (0.4275 * tempF * Math.pow(windMph, 0.16));
}
