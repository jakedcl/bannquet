import type { UsnoDaySky, UsnoTimedEvent } from '@/lib/mountain-weather/sky-types';
import { easternTimeZoneLabel } from '@/lib/mountain-weather/usno-dates';

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

export function normalizeUsnoClock(time: string): { clock: string; marker: 'DT' | 'ST' | null } {
  const m = time.match(/^(\d{1,2}:\d{2})(?:\s+(DT|ST))?$/i);
  if (!m) return { clock: time.trim(), marker: null };
  const marker = m[2]?.toUpperCase() === 'DT' ? 'DT' : m[2]?.toUpperCase() === 'ST' ? 'ST' : null;
  return { clock: m[1], marker };
}

function minutesFromClock(value: string): number | null {
  const { clock } = normalizeUsnoClock(value);
  const m = clock.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function dayLengthLabel(sundata: UsnoTimedEvent[]): string | null {
  const rise = sundata.find((row) => row.phen === 'Rise')?.display;
  const set = sundata.find((row) => row.phen === 'Set')?.display;
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

  const mapEvents = (rows: UsnoApiDay['sundata']): UsnoTimedEvent[] =>
    (rows ?? []).map((row) => {
      const { clock, marker } = normalizeUsnoClock(row.time);
      return {
        phen: row.phen,
        time: row.time ?? null,
        display: clock,
        marker,
      };
    });

  const sunEvents = mapEvents(data.sundata);
  const moonEvents = mapEvents(data.moondata);

  const closest = data.closestphase;
  const closestPhase =
    closest?.phase && closest.year && closest.month && closest.day
      ? {
          phase: closest.phase,
          when: `${closest.month}/${closest.day}/${closest.year} ${closest.time ?? ''}`.trim(),
        }
      : null;

  const tz = easternTimeZoneLabel(data.isdst ?? null);

  return {
    dateEt,
    dayOfWeek: data.day_of_week ?? null,
    year: data.year,
    month: data.month,
    day: data.day,
    tzLabel: tz,
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