import type { UsnoDaySky, UsnoTimedEvent } from '@/lib/mountain-weather/sky-types';
import { formatEtLabel } from '@/lib/mountain-weather/usno-dates';

type UsnoApiDay = {
  year: number;
  month: number;
  day: number;
  day_of_week?: string;
  tz?: number;
  isdst?: boolean;
  label?: string | null;
  curphase?: string;
  fracillum?: string;
  closestphase?: { phase?: string; year?: number; month?: number; day?: number; time?: string };
  sundata?: Array<{ phen: string; time: string }>;
  moondata?: Array<{ phen: string; time: string }>;
};

function minutesFromClock(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function dayLengthLabel(sundata: UsnoTimedEvent[]): string | null {
  const rise = sundata.find((row) => row.phen === 'Rise')?.time;
  const set = sundata.find((row) => row.phen === 'Set')?.time;
  if (!rise || !set) return null;
  const a = minutesFromClock(rise);
  const b = minutesFromClock(set);
  if (a === null || b === null || b <= a) return null;
  const minutes = b - a;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

export function parseUsnoRsttDay(dateEt: string, sourceUrl: string, body: unknown): UsnoDaySky {
  const root = body as {
    properties?: { data?: UsnoApiDay };
  };
  const data = root.properties?.data;
  if (!data) {
    throw new Error('USNO response missing properties.data');
  }

  const sunEvents: UsnoTimedEvent[] = (data.sundata ?? []).map((row) => ({
    phen: row.phen,
    time: row.time ?? null,
  }));
  const moonEvents: UsnoTimedEvent[] = (data.moondata ?? []).map((row) => ({
    phen: row.phen,
    time: row.time ?? null,
  }));

  const closest = data.closestphase;
  const closestPhase =
    closest?.phase && closest.year && closest.month && closest.day
      ? {
          phase: closest.phase,
          when: `${closest.month}/${closest.day}/${closest.year} ${closest.time ?? ''}`.trim(),
        }
      : null;

  return {
    dateEt,
    dayOfWeek: data.day_of_week ?? null,
    year: data.year,
    month: data.month,
    day: data.day,
    tzLabel: formatEtLabel(dateEt),
    isDst: data.isdst ?? null,
    label: data.label ?? null,
    curphase: data.curphase ?? null,
    fracillum: data.fracillum ?? null,
    closestPhase,
    sunEvents,
    moonEvents,
    dayLength: dayLengthLabel(sunEvents),
    sourceUrl,
  };
}