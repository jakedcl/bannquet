import { WeatherData } from '@/types/weather';

const USER_AGENT = 'Bannquet-Weather-App (admin@bannquet.com)';

// Just the mountains we care about
export const MOUNTAINS = [
  {
    name: 'Mount Marcy',
    region: 'ADIRONDACKS',
    lat: 44.1128,
    lon: -73.9237,
    elevation: 5344
  },
  {
    name: 'Whiteface Mountain',
    region: 'ADIRONDACKS',
    lat: 44.3658,
    lon: -73.9026,
    elevation: 4867
  },
  {
    name: 'Giant Mountain',
    region: 'ADIRONDACKS',
    lat: 44.1611,
    lon: -73.7201,
    elevation: 4627
  },
  {
    name: 'Cascade Mountain',
    region: 'ADIRONDACKS',
    lat: 44.2197,
    lon: -73.8603,
    elevation: 4098
  }
];

// Simple helper to fetch data
async function fetchWeather(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  
  if (!response.ok) {
    throw new Error(`Weather API Error: ${response.statusText}`);
  }
  
  return response.json();
}

// Get basic weather data for a location
export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  // First get the forecast URL for this location
  const pointData = await fetchWeather(
    `https://api.weather.gov/points/${lat},${lon}`
  );
  
  // Then get the actual forecast
  const forecastData = await fetchWeather(
    pointData.properties.forecastHourly
  );
  
  const currentPeriod = forecastData.properties.periods[0];
  
  return {
    temperature: currentPeriod.temperature,
    conditions: [currentPeriod.shortForecast],
    windSpeed: currentPeriod.windSpeed,
    windDirection: currentPeriod.windDirection,
    precipitation: currentPeriod.probabilityOfPrecipitation?.value ?? 0,
    timestamp: currentPeriod.startTime,
    icon: currentPeriod.icon
  };
} 