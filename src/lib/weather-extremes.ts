import { feelsLikeF } from '@/lib/feels-like';
import { loadMountainConditionsReport, type MeasuredConditionSpot } from '@/lib/mountain-weather/measured-conditions';

export type ExtremeStat = {
  label: string;
  value: string;
  location: string;
  stationId?: string;
  ageMinutes?: number | null;
};

export type ExtremeSpot = {
  mountain: string;
  state: string;
  temperature: number;
  minTemperature: number;
  maxTemperature: number;
  windChill: number;
  windSpeed: number;
  windGust: number | null;
  /** Measured conditions never set forecast snow flags. */
  isSnowing: boolean;
  stationId?: string;
  ageMinutes?: number | null;
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

  const gustMph = (s: ExtremeSpot) => (s.windGust != null && s.windGust > 0 ? s.windGust : null);
  const windCandidates = results.filter((s) => s.windSpeed > 0 || gustMph(s) != null);
  const highestWind = (windCandidates.length ? windCandidates : results).reduce((max, curr) => {
    const maxGust = gustMph(max);
    const curGust = gustMph(curr);
    const maxScore = Math.max(maxGust != null && maxGust > max.windSpeed ? maxGust : max.windSpeed, max.windSpeed);
    const curScore = Math.max(curGust != null && curGust > curr.windSpeed ? curGust : curr.windSpeed, curr.windSpeed);
    return curScore > maxScore ? curr : max;
  }, (windCandidates.length ? windCandidates : results)[0]);
  const highestTemp = results.reduce((max, curr) =>
    curr.temperature > max.temperature ? curr : max, results[0]);
  const coldest = results.reduce((min, curr) =>
    curr.windChill < min.windChill ? curr : min, results[0]);

  return [
    {
      label: 'HIGHEST WIND',
      value:
        gustMph(highestWind) != null && gustMph(highestWind)! > highestWind.windSpeed
          ? `${highestWind.windSpeed} mph, gusts ${gustMph(highestWind)}`
          : `${highestWind.windSpeed} mph`,
      location: `${highestWind.mountain}, ${highestWind.state}`,
      stationId: highestWind.stationId,
      ageMinutes: highestWind.ageMinutes,
    },
    {
      label: 'HIGHEST TEMP',
      value: `${highestTemp.temperature}°F`,
      location: `${highestTemp.mountain}, ${highestTemp.state}`,
      stationId: highestTemp.stationId,
      ageMinutes: highestTemp.ageMinutes,
    },
    {
      label: 'COLDEST FEELS-LIKE',
      value: `${coldest.windChill}°F`,
      location: `${coldest.mountain}, ${coldest.state}`,
      stationId: coldest.stationId,
      ageMinutes: coldest.ageMinutes,
    },
  ];
}

export async function loadWeatherExtremes(): Promise<ExtremeReport & { glances?: import('@/lib/mountain-weather/hub-glance').HubGlance[] }> {
  const report = await loadMountainConditionsReport();
  const spots: ExtremeSpot[] = report.spots.map((spot) => ({
    mountain: spot.mountain,
    state: spot.state,
    temperature: spot.temperature,
    minTemperature: spot.minTemperature,
    maxTemperature: spot.maxTemperature,
    windChill: spot.windChill,
    windSpeed: spot.windSpeed,
    windGust: spot.windGust,
    isSnowing: false,
    stationId: spot.stationId,
    ageMinutes: spot.ageMinutes,
  }));

  return {
    success: report.success,
    stats: extremeStatsFromSpots(spots),
    spots,
    glances: report.glances,
    error: report.error,
    attempted: report.attempted,
    succeeded: report.succeeded,
    failed: report.failed,
  };
}
