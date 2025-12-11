export type WeatherPoint = {
  gridId: string;
  gridX: number;
  gridY: number;
  forecast: string;
  forecastHourly: string;
};

export type Measurement = {
  value: number | null;
  unitCode: string;
};

export type CloudLayer = {
  base: Measurement;
  amount: string;
};

export interface WeatherHazard {
  id: string;
  event: string;
  headline?: string;
  description?: string;
  severity?: string;
  instruction?: string;
  areaDesc?: string;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature?: number | null;
  conditions: string[];
  windSpeed: string;
  windDirection: string;
  windGust?: number | null;
  summitWind?: number | null;
  precipitation: number;
  snowLevel?: number | null;
  snowAmount?: number | null;
  iceAccumulation?: number | null;
  visibility?: number | null;
  skyCover?: number | null;
  ceilingHeight?: number | null;
  hazards: WeatherHazard[];
  timestamp: string;
  icon?: string;
  hourlyForecast?: ForecastSnippet[];
  dailyForecast?: ForecastSnippet[];
}

export type ForecastSnippet = {
  name: string;
  startTime: string;
  temperature: number;
  windSpeed?: string;
  shortForecast?: string;
  isDaytime?: boolean;
  icon?: string;
  secondaryTemp?: number;
  secondaryForecast?: string;
};

export type WeatherAlert = {
  id: string;
  areaDesc: string;
  headline: string;
  description: string;
  severity: string;
  urgency: string;
  event: string;
  effective: string;
  expires: string;
};

export type ForecastPeriod = {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation: Measurement;
};

export type Forecast = {
  periods: ForecastPeriod[];
  updated: string;
};

export type RadarLayer = {
  id: string;
  name: string;
  url: string;
  type: 'precipitation' | 'radar' | 'satellite' | 'lightning';
  opacity: number;
  visible: boolean;
};

export type Location = {
  lat: number;
  lon: number;
  name: string;
  elevation: number;
};

export type SkyCondition = 'IO' | 'OB' | 'AB' | null; // IO = In and out of clouds, OB = Obscured, AB = Above clouds

export type MountainForecastPeriod = {
  name: string;  // e.g. "TONIGHT", "WEDNESDAY"
  forecast: string;
  temperature: number;
  windChill: number;
  windSpeed: number;
  windGust: number;
  windDirection: string;
  skyCover: number;
  precipitationChance: number;
  snowAmount: number;
  iceAccumulation: number;
  skyCondition: SkyCondition;
};

export type MountainForecast = {
  location: string;
  elevation: number;
  lastUpdated: string;
  periods: MountainForecastPeriod[];
  hourly: {
    time: string;
    temperature: number;
    windChill: number;
    windSpeed: number;
    windGust: number;
    precipChance: number;
    snowAmount: number;
    iceAccumulation: number;
    skyCover: number;
  }[];
};

export type Mountain = {
  name: string;
  region: string;
  lat: number;
  lon: number;
  elevation: number;
}; 