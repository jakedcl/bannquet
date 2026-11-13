import { ForecastPeriod, ForecastSnippet, WeatherData, WeatherHazard } from '@/types/weather';
import { outsideFetch } from '@/lib/outside-fetch';
import { feelsLikeF, windMphFromText } from '@/lib/feels-like';
import {
  gridElevationFt,
  gridSeriesSamples,
  normalizeGridValue,
  type GridSeries,
} from '@/lib/grid-series';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

// Simple helper to fetch data
async function fetchWeather<T = unknown>(url: string): Promise<T> {
  const response = await outsideFetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/geo+json',
    },
  });
  
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Weather API Error: ${response.status} ${response.statusText} (${url})${body ? ` :: ${body.slice(0, 200)}` : ''}`
    );
  }
  
  return response.json() as Promise<T>;
}

type AlertFeature = {
  id: string;
  properties?: {
    event?: string;
    headline?: string;
    description?: string;
    severity?: string;
    instruction?: string;
    areaDesc?: string;
  };
};

async function fetchAlerts(lat: number, lon: number): Promise<WeatherHazard[]> {
  try {
    const alertResponse = await fetchWeather<{ features?: AlertFeature[] }>(
      `https://api.weather.gov/alerts/active?point=${lat},${lon}`
    );

    if (!alertResponse?.features) return [];

    return alertResponse.features.map((feature) => ({
      id: feature.id,
      event: feature.properties?.event ?? '',
      headline: feature.properties?.headline,
      description: feature.properties?.description,
      severity: feature.properties?.severity,
      instruction: feature.properties?.instruction,
      areaDesc: feature.properties?.areaDesc,
    }));
  } catch (error) {
    console.error('Failed to fetch weather alerts:', error);
    return [];
  }
}

// Get enhanced weather data for a location
type PointResponse = {
  properties: {
    forecastHourly: string;
    forecast: string;
    gridX: number;
    gridY: number;
    gridId: string;
  };
};

type GridpointResponse = {
  properties: Record<string, GridSeries> & {
    elevation?: { value?: number | null; uom?: string };
  };
};

type ForecastResponse = {
  properties: {
    periods: ForecastPeriod[];
  };
};

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const pointData = await fetchWeather<PointResponse>(
    `https://api.weather.gov/points/${lat},${lon}`
  );
  
  const { forecastHourly, forecast, gridX, gridY, gridId } = pointData.properties;

  const [hourlyData, dailyData, gridData, hazards] = await Promise.all([
    fetchWeather<ForecastResponse>(forecastHourly),
    fetchWeather<ForecastResponse>(forecast),
    fetchWeather<GridpointResponse>(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}`),
    fetchAlerts(lat, lon),
  ]);

  const hourlyPeriods = Array.isArray(hourlyData?.properties?.periods)
    ? hourlyData.properties.periods
    : [];
  const dailyPeriods = Array.isArray(dailyData?.properties?.periods)
    ? dailyData.properties.periods
    : [];
  const currentPeriod = hourlyPeriods[0] ?? null;
  const gridProps = gridData.properties;

  const temperatureF = typeof currentPeriod?.temperature === 'number' ? currentPeriod.temperature : null;
  const apparentTemperature = normalizeGridValue(gridProps.apparentTemperature);
  const windChill = normalizeGridValue(gridProps.windChill);
  const heatIndex = normalizeGridValue(gridProps.heatIndex);
  const relativeHumidity = normalizeGridValue(gridProps.relativeHumidity);
  const summitWind = normalizeGridValue(gridProps.windSpeed);
  const windGust = normalizeGridValue(gridProps.windGust);
  const snowLevel = normalizeGridValue(gridProps.snowLevel);
  const snowAmount = normalizeGridValue(gridProps.snowfallAmount);
  const iceAccumulation = normalizeGridValue(gridProps.iceAccumulation);
  const visibility = normalizeGridValue(gridProps.visibility);
  const ceilingHeight = normalizeGridValue(gridProps.ceilingHeight);
  const elevationFt = gridElevationFt(gridProps.elevation);
  const gridExtras = {
    elevationFt,
    snowLevel: gridSeriesSamples(gridProps.snowLevel),
    snowfallAmount: gridSeriesSamples(gridProps.snowfallAmount),
    iceAccumulation: gridSeriesSamples(gridProps.iceAccumulation),
    ceilingHeight: gridSeriesSamples(gridProps.ceilingHeight),
  };

  const precipRaw = currentPeriod?.probabilityOfPrecipitation?.value;
  const precipitation = precipRaw === null || precipRaw === undefined ? null : precipRaw;

  const feelsLike = temperatureF === null
    ? null
    : feelsLikeF({
        tempF: temperatureF,
        windMph: windMphFromText(currentPeriod?.windSpeed),
        heatIndexF: heatIndex,
      });

  const hourlyForecast = mapForecastSlice(hourlyPeriods.slice(0, 8));
  const dailyForecast = buildDailyHighLow(dailyPeriods, 7);
  const forecastPeriods = mapForecastSlice(dailyPeriods.slice(0, 8));
  
  return {
    temperature: temperatureF,
    apparentTemperature,
    windChill,
    heatIndex,
    feelsLike,
    relativeHumidity,
    conditions: currentPeriod?.shortForecast ? [currentPeriod.shortForecast] : [],
    windSpeed: currentPeriod?.windSpeed ?? null,
    windDirection: currentPeriod?.windDirection ?? null,
    windGust,
    summitWind,
    precipitation,
    snowLevel,
    snowAmount,
    iceAccumulation,
    visibility,
    ceilingHeight,
    gridExtras,
    hazards,
    timestamp: currentPeriod?.startTime ?? new Date().toISOString(),
    icon: currentPeriod?.icon,
    hourlyForecast,
    dailyForecast,
    forecastPeriods,
  };
}

function mapForecastSlice(periods: ForecastPeriod[], compactName = false): ForecastSnippet[] {
  return periods.map((period) => ({
    name: compactName ? abbreviateName(period.name, period.startTime) : period.name,
    startTime: period.startTime,
    temperature: period.temperature,
    windSpeed: period.windSpeed,
    shortForecast: period.shortForecast,
    isDaytime: period.isDaytime,
    icon: period.icon,
  }));
}

function abbreviateName(_name: string, startTime: string) {
  return new Date(startTime).toLocaleDateString(undefined, { weekday: 'short' });
}

function buildDailyHighLow(periods: ForecastPeriod[], limit: number): ForecastSnippet[] {
  const results: ForecastSnippet[] = [];
  for (let i = 0; i < periods.length && results.length < limit; i++) {
    const period = periods[i];
    if (!period.name) continue;
    const companion = findCompanionPeriod(periods, i);
    const high = period.isDaytime ? period.temperature : companion?.temperature ?? period.temperature;
    const low = period.isDaytime ? companion?.temperature ?? period.temperature : period.temperature;
    const label = abbreviateName('', period.startTime);
    results.push({
      name: label,
      startTime: period.startTime,
      temperature: high,
      windSpeed: period.windSpeed,
      shortForecast: period.shortForecast,
      isDaytime: true,
      icon: period.icon,
      secondaryTemp: low,
      secondaryForecast: companion?.shortForecast,
    });
    if (companion) {
      i = periods.indexOf(companion);
    }
  }
  return results.slice(0, limit);
}

function findCompanionPeriod(periods: ForecastPeriod[], index: number) {
  const current = periods[index];
  for (let i = index + 1; i < periods.length; i++) {
    const candidate = periods[i];
    if (!candidate.name) continue;
    if (current.isDaytime && candidate.name.toLowerCase().includes('night')) {
      return candidate;
    }
    if (!current.isDaytime && !candidate.name.toLowerCase().includes('night')) {
      return candidate;
    }
  }
  return undefined;
} 