import { REGION_LABELS, REGION_WEATHER_SECTIONS } from '@/lib/regions';
import { feelsLikeF, gridValueAt, windMphFromText } from '@/lib/feels-like';

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
  /** True when the hourly PoP is above 50% and air temp is below freezing (forecast, not observed). */
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

  // Sustained speed from the NWS hourly forecast; gusts come from the gridpoint data.
  const highestWind = results.reduce((max, curr) =>
    curr.windSpeed > max.windSpeed ? curr : max, results[0]);
  const highestTemp = results.reduce((max, curr) =>
    curr.maxTemperature > max.maxTemperature ? curr : max, results[0]);
  // windChill already falls back to the plain temp when it isn't cold and windy.
  const coldest = results.reduce((min, curr) =>
    curr.windChill < min.windChill ? curr : min, results[0]);

  const snowingLocations = results.filter((spot) => spot.isSnowing);
  const snowingNames = snowingLocations.map((spot) => spot.mountain);
  const snowingPreview = snowingNames.length <= 3
    ? snowingNames.join(', ')
    : `${snowingNames.slice(0, 3).join(', ')} +${snowingNames.length - 3} more`;

  return [
    {
      label: 'HIGHEST WIND',
      value: highestWind.windGust > highestWind.windSpeed
        ? `${highestWind.windSpeed}mph, gusts ${highestWind.windGust}`
        : `${highestWind.windSpeed}mph`,
      location: `${highestWind.mountain}, ${highestWind.state}`,
    },
    {
      label: 'HIGHEST TEMP',
      value: `${highestTemp.maxTemperature}°F`,
      location: `${highestTemp.mountain}, ${highestTemp.state}`,
    },
    {
      label: 'COLDEST FEELS-LIKE',
      value: `${coldest.windChill}°F`,
      location: `${coldest.mountain}, ${coldest.state}`,
    },
    ...(snowingLocations.length > 0 ? [{
      label: 'FORECAST SNOW CHANCE',
      value: snowingPreview,
      location: `${snowingLocations.length} of ${results.length} sampled peaks`,
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
          const windSpeedNum = windMphFromText(weather.windSpeed ?? '');
          const windGustNum = weather.windGust ?? 0;
          const currentTemp = weather.temperature;
          const windChill = currentTemp === null
            ? null
            : feelsLikeF({ tempF: currentTemp, windMph: windSpeedNum });
          const hourlyTemps = weather.hourlyTemps;
          const minTemp = hourlyTemps.length > 0 && currentTemp !== null
            ? Math.min(...hourlyTemps, currentTemp)
            : (hourlyTemps.length > 0 ? Math.min(...hourlyTemps) : currentTemp);
          const maxTemp = hourlyTemps.length > 0 && currentTemp !== null
            ? Math.max(...hourlyTemps, currentTemp)
            : (hourlyTemps.length > 0 ? Math.max(...hourlyTemps) : currentTemp);

          const precip = weather.precipitation;
          const isSnowing = precip !== null && currentTemp !== null && precip > 50 && currentTemp < 32;

          return {
            mountain: mountain.name,
            state: mountain.state,
            temperature: currentTemp ?? NaN,
            minTemperature: minTemp ?? NaN,
            maxTemperature: maxTemp ?? NaN,
            windChill: windChill === null ? NaN : Math.round(windChill),
            windSpeed: windSpeedNum,
            windGust: windGustNum,
            isSnowing,
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


type NwsPointResponse = {
  properties?: {
    forecastHourly?: string;
    forecastGridData?: string;
  };
};

type NwsGridResponse = {
  properties?: {
    windGust?: {
      uom?: string;
      values?: Array<{ validTime?: string; value?: number | null }>;
    };
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

  const [hourlyData, gustMph] = await Promise.all([
    fetchNwsJson<NwsHourlyResponse>(forecastHourly),
    pointData.properties?.forecastGridData
      ? fetchNwsJson<NwsGridResponse>(pointData.properties.forecastGridData)
        .then(currentGustMph)
        .catch(() => null)
      : Promise.resolve(null),
  ]);
  const periods = Array.isArray(hourlyData.properties?.periods) ? hourlyData.properties?.periods : [];
  const currentPeriod = periods[0];
  if (!currentPeriod) {
    throw new Error('NWS hourly forecast missing periods');
  }

  const hourlyTemps = periods
    .slice(0, 24)
    .map((period) => period.temperature)
    .filter((temp): temp is number => typeof temp === 'number');

  const precip = currentPeriod.probabilityOfPrecipitation?.value;
  return {
    temperature: typeof currentPeriod.temperature === 'number' ? currentPeriod.temperature : null,
    windSpeed: currentPeriod.windSpeed ?? null,
    windGust: gustMph,
    precipitation: precip === null || precip === undefined ? null : precip,
    hourlyTemps,
  };
}

// Gridpoint values are ISO intervals ("2026-11-04T00:00:00+00:00/PT2H") in km/h.
function currentGustMph(grid: NwsGridResponse, now = Date.now()): number | null {
  const gust = grid.properties?.windGust;
  const value = gridValueAt(gust?.values, now);
  if (value === null) return null;
  const mph = gust?.uom?.includes('km_h') ? value * 0.621371 : value;
  return Math.round(mph);
}
