import { loadMountainConditionsReport } from '@/lib/mountain-weather/measured-conditions';
import type { StationObsKind } from '@/lib/mountain-weather/station-bindings';

export type ExtremeStat = {
  label: string;
  value: string;
  location: string;
  stationId?: string;
  stationName?: string | null;
  stationKind?: StationObsKind;
  stationDistanceMi?: number;
  stationElevationFt?: number | null;
  elevationDiffFt?: number | null;
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
  stationName?: string | null;
  stationKind?: StationObsKind;
  stationDistanceMi?: number;
  stationElevationFt?: number | null;
  elevationDiffFt?: number | null;
  ageMinutes?: number | null;
};

export type ExtremeReport = {
  success: boolean;
  /** True when measured spots failed but place forecast lines still loaded. */
  partial?: boolean;
  stats: ExtremeStat[];
  spots: ExtremeSpot[];
  glances?: import('@/lib/mountain-weather/hub-glance').HubGlance[];
  error?: string;
  attempted: number;
  succeeded: number;
  failed: number;
};

export function extremeStatsFromSpots(results: ExtremeSpot[]): ExtremeStat[] {
  if (results.length === 0) return [];

  // A shared valley station is one measurement even when several peaks use it.
  const unique = [...new Map([...results].reverse().map((s) => [s.stationId ?? `${s.mountain}-${s.state}`, s])).values()];
  const attribution = (s: ExtremeSpot) => s.stationId
    ? `${s.stationName ?? s.stationId} (${s.stationId}, ${s.stationKind ?? 'nearby'} station), ${s.stationDistanceMi != null ? `${s.stationDistanceMi.toFixed(1)} mi from ` : 'listed for '}${s.mountain}`
    : `${s.mountain}, ${s.state}`;

  // Wind and cold are summit questions: use summit stations when any reported, so a valley
  // airport's 7 mph never headlines a night with 60 mph on the ridges.
  const summits = unique.filter((s) => s.stationKind === 'summit' || s.stationKind === 'nearby-higher');
  const exposed = summits.length > 0 ? summits : unique;
  // No fresh summit report: say the wind and cold are from valley stations, not the peaks.
  const summitWord = summits.length > 0 ? 'SUMMIT ' : unique.some((s) => s.stationKind) ? 'VALLEY ' : '';

  const gustMph = (s: ExtremeSpot) => (s.windGust != null && s.windGust > 0 ? s.windGust : null);
  const windCandidates = exposed.filter((s) => s.windSpeed > 0 || gustMph(s) != null);
  const highestWind = (windCandidates.length ? windCandidates : exposed).reduce((max, curr) => {
    const maxGust = gustMph(max);
    const curGust = gustMph(curr);
    const maxScore = Math.max(maxGust != null && maxGust > max.windSpeed ? maxGust : max.windSpeed, max.windSpeed);
    const curScore = Math.max(curGust != null && curGust > curr.windSpeed ? curGust : curr.windSpeed, curr.windSpeed);
    return curScore > maxScore ? curr : max;
  }, (windCandidates.length ? windCandidates : exposed)[0]);
  const highestTemp = unique.reduce((max, curr) =>
    curr.temperature > max.temperature ? curr : max, unique[0]);
  const coldest = exposed.reduce((min, curr) =>
    curr.windChill < min.windChill ? curr : min, exposed[0]);

  return [
    {
      label: `HIGHEST ${summitWord}WIND`,
      value:
        gustMph(highestWind) != null && gustMph(highestWind)! > highestWind.windSpeed
          ? `${highestWind.windSpeed} mph, gusts ${gustMph(highestWind)}`
          : `${highestWind.windSpeed} mph`,
      location: attribution(highestWind),
      stationId: highestWind.stationId,
      ageMinutes: highestWind.ageMinutes,
    },
    {
      label: 'HIGHEST TEMP',
      value: `${highestTemp.temperature}°F`,
      location: attribution(highestTemp),
      stationId: highestTemp.stationId,
      ageMinutes: highestTemp.ageMinutes,
    },
    {
      label: `COLDEST ${summitWord}FEELS-LIKE`,
      value: `${coldest.windChill}°F`,
      location: attribution(coldest),
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
    stationName: spot.stationName,
    stationKind: spot.stationKind,
    stationDistanceMi: spot.stationDistanceMi,
    stationElevationFt: spot.stationElevationFt,
    elevationDiffFt: spot.elevationDiffFt,
    ageMinutes: spot.ageMinutes,
  }));

  return {
    success: report.success,
    partial: report.partial,
    stats: extremeStatsFromSpots(spots),
    spots,
    glances: report.glances,
    error: report.error,
    attempted: report.attempted,
    succeeded: report.succeeded,
    failed: report.failed,
  };
}
