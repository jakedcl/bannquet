import { ForecastPeriod, ForecastSnippet, WeatherData, WeatherHazard } from '@/types/weather';
import { DEFAULT_REGION, REGION_WEATHER_SECTIONS, RegionCode } from '@/lib/regions';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

export function getMountainsForRegion(region: RegionCode) {
  const sections = REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
  return sections.flatMap((section) => section.spots);
}

// Simple helper to fetch data
async function fetchWeather<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  
  if (!response.ok) {
    throw new Error(`Weather API Error: ${response.statusText}`);
  }
  
  return response.json() as Promise<T>;
}

type GridSeries = {
  values?: { validTime: string; value: number | null }[];
  uom?: string;
};

const UNIT_CONVERSIONS: Record<string, (value: number) => number> = {
  'wmoUnit:degC': (value) => (value * 9) / 5 + 32,
  'wmoUnit:km_h-1': (value) => value * 0.621371,
  'wmoUnit:m_s-1': (value) => value * 2.23694,
  'wmoUnit:m': (value) => value * 3.28084,
  'wmoUnit:mm': (value) => value * 0.0393701,
  'wmoUnit:cm': (value) => value * 0.393701,
  'wmoUnit:km': (value) => value * 0.621371,
};

function normalizeValue(series?: GridSeries): number | null {
  if (!series?.values?.length) return null;
  const entry = series.values.find((v) => v.value !== null);
  if (!entry || entry.value === null) return null;
  if (!series.uom) return entry.value;
  const converter = UNIT_CONVERSIONS[series.uom];
  return converter ? converter(entry.value) : entry.value;
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
  properties: Record<string, GridSeries>;
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
  const currentPeriod = hourlyPeriods[0];
  const gridProps = gridData.properties;
  
  const temperatureF = currentPeriod.temperature;
  const apparentTemperature = normalizeValue(gridProps.apparentTemperature);
  const summitWind = normalizeValue(gridProps.windSpeed);
  const windGust = normalizeValue(gridProps.windGust);
  const snowLevel = normalizeValue(gridProps.snowLevel);
  const snowAmount = normalizeValue(gridProps.snowfallAmount);
  const iceAccumulation = normalizeValue(gridProps.iceAccumulation);
  const visibility = normalizeValue(gridProps.visibility);
  const ceilingHeight = normalizeValue(gridProps.ceilingHeight);

  const hourlyForecast = mapForecastSlice(hourlyPeriods.slice(0, 8));
  const dailyForecast = buildDailyHighLow(dailyPeriods, 7);
  
  return {
    temperature: temperatureF,
    apparentTemperature,
    conditions: [currentPeriod.shortForecast],
    windSpeed: currentPeriod.windSpeed,
    windDirection: currentPeriod.windDirection,
    windGust,
    summitWind,
    precipitation: currentPeriod.probabilityOfPrecipitation?.value ?? 0,
    snowLevel,
    snowAmount,
    iceAccumulation,
    visibility,
    ceilingHeight,
    hazards,
    timestamp: currentPeriod.startTime,
    icon: currentPeriod.icon,
    hourlyForecast,
    dailyForecast,
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