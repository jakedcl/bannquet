import type { GridExtras, WeatherData } from '@/types/weather';

/** Parsed NWS grid + hourly forecast for the Basic forecast block (no raw gridpoint blob). */
export type BaselineForecast = {
  temperature: number | null;
  feelsLike: number | null;
  conditions: string[];
  windSpeed: string | null;
  windDirection: string | null;
  windGust: number | null;
  precipitation: number | null;
  relativeHumidity: number | null;
  visibility: number | null;
  timestamp: string;
  icon?: string;
  hourlyForecast: WeatherData['hourlyForecast'];
  dailyForecast: WeatherData['dailyForecast'];
  hazards: WeatherData['hazards'];
  gridExtras: GridExtras | null;
  mapUrl: string;
};

export function baselineFromWeather(data: WeatherData, lat: number, lon: number): BaselineForecast {
  return {
    temperature: data.temperature,
    feelsLike: data.feelsLike,
    conditions: data.conditions,
    windSpeed: data.windSpeed,
    windDirection: data.windDirection,
    windGust: data.windGust ?? null,
    precipitation: data.precipitation,
    relativeHumidity: data.relativeHumidity ?? null,
    visibility: data.visibility ?? null,
    timestamp: data.timestamp,
    icon: data.icon,
    hourlyForecast: data.hourlyForecast,
    dailyForecast: data.dailyForecast,
    hazards: data.hazards,
    gridExtras: data.gridExtras ?? null,
    mapUrl: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`,
  };
}
