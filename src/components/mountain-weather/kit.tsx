import type { ReactNode } from 'react';
import type { ForecastSnippet } from '@/types/weather';

/*
 * Weather kit (Wx-Kit board): the small pieces every weather page shares.
 * Server components; no state. Colors come from tokens only.
 */

/* ---- Reading tiles ----------------------------------------------------- */

/** One number with its label, e.g. TEMP 19° / Feels like -3°. */
export function ReadingTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="tile flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
      <span className="text-tag font-bold uppercase tracking-button text-ink-3">{label}</span>
      <span className="text-stat font-bold tabular-nums [overflow-wrap:anywhere]">{value}</span>
      {sub ? <span className="text-caption text-ink-2 [overflow-wrap:anywhere]">{sub}</span> : null}
    </div>
  );
}

export function ReadingGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>;
}

/* ---- Source and freshness line ---------------------------------------- */

export type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';

/** Fresh under 1 h (green), aging under 6 h (yellow), stale after (gray). */
export function freshnessOf(iso: string | null | undefined, now = Date.now()): { level: Freshness; ago: string | null } {
  if (!iso) return { level: 'unknown', ago: null };
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return { level: 'unknown', ago: null };
  const minutes = Math.max(0, Math.round((now - t) / 60000));
  const ago = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : minutes < 48 * 60 ? `${Math.round(minutes / 60)} hr ago` : `${Math.round(minutes / 1440)} days ago`;
  const level: Freshness = minutes < 60 ? 'fresh' : minutes < 360 ? 'aging' : 'stale';
  return { level, ago };
}

const DOT: Record<Freshness, string> = {
  fresh: 'bg-ok',
  aging: 'bg-yellow-deep',
  stale: 'bg-stale',
  unknown: 'bg-stale',
};

/** "NWS gridpoint forecast · 3-hour steps   ● updated 12 min ago" */
export function SourceLine({ source, at, verb = 'updated' }: { source: ReactNode; at?: string | null; verb?: string }) {
  const { level, ago } = freshnessOf(at);
  return (
    <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-caption text-ink-2">
      <span className="min-w-0 [overflow-wrap:anywhere]">{source}</span>
      {ago ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${DOT[level]}`} aria-hidden="true" />
          {verb} {ago}
        </span>
      ) : null}
    </p>
  );
}

/* ---- Source receipt (one line at the end of every panel) -------------- */

export type ReceiptState = 'ok' | 'late' | 'error' | 'off' | 'link';

export const RECEIPT_DOT: Record<ReceiptState, string> = {
  ok: 'bg-ok',
  late: 'bg-yellow-deep',
  error: 'bg-danger',
  off: 'bg-stale',
  link: 'bg-stale',
};

export const RECEIPT_WORD: Record<ReceiptState, string> = {
  ok: 'Up to date',
  late: 'Older than usual',
  error: 'Could not load',
  off: 'Off season',
  link: 'Link only',
};

/** "NWS Burlington", not "National Weather Service Burlington". */
export function shortOrg(org: string): string {
  return org.replace(/^National Weather Service\b/, 'NWS').trim();
}

/**
 * Green when the source is on schedule, yellow when it is more than twice its usual
 * interval old (or the reader marked it stale), red when it failed, gray off-season.
 */
export function receiptState(input: {
  status?: string | null;
  at?: string | null;
  expectedEveryHours?: number;
  now?: number;
}): ReceiptState {
  const { status, at, expectedEveryHours, now = Date.now() } = input;
  if (status === 'error') return 'error';
  if (status === 'seasonal-off') return 'off';
  if (status === 'link-only') return 'link';
  if (status === 'stale' || status === 'not-in-issuance') return 'late';
  if (at && expectedEveryHours) {
    const t = new Date(at).getTime();
    if (Number.isFinite(t) && now - t > expectedEveryHours * 2 * 3600000) return 'late';
  }
  return 'ok';
}

function receiptTime(at: string): string | null {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const sameDay =
    d.toLocaleDateString('en-US', { timeZone: 'America/New_York' }) ===
    new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * The one source line every weather panel ends with:
 * "● NWS Gray · Recreation Forecast (REC) · issued 7:40 PM (1 hr ago) · Original ›".
 * The dot says whether the source is working; its meaning is spelled out for screen readers
 * and on hover.
 */
export function SourceReceipt({
  org,
  product,
  at,
  verb = 'issued',
  status,
  expectedEveryHours,
  href,
  linkLabel = 'Original',
  extra,
}: {
  org: string;
  product?: string | null;
  at?: string | null;
  verb?: string;
  status?: string | null;
  expectedEveryHours?: number;
  href?: string | null;
  linkLabel?: string;
  extra?: ReactNode;
}) {
  const state = receiptState({ status, at, expectedEveryHours });
  const time = at ? receiptTime(at) : null;
  const { ago } = freshnessOf(at);
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-hairline pt-2 text-caption text-ink-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${RECEIPT_DOT[state]}`} title={RECEIPT_WORD[state]} aria-hidden="true" />
      <span className="sr-only">{RECEIPT_WORD[state]}.</span>
      <span className="font-bold text-ink [overflow-wrap:anywhere]">{shortOrg(org)}</span>
      {product ? <span className="[overflow-wrap:anywhere]">· {product}</span> : null}
      {state === 'error' ? (
        <span>· could not load</span>
      ) : time ? (
        <span>
          · {verb} {time}
          {ago ? ` (${ago})` : ''}
        </span>
      ) : null}
      {extra ? <span>· {extra}</span> : null}
      {href ? (
        <span>
          ·{' '}
          <a href={href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            {linkLabel} ›
          </a>
        </span>
      ) : null}
    </p>
  );
}

/** Parse the time labels image sources publish ("Fri, 20 Nov 2026 01:55:03 GMT", "2026-11-19 05 UTC"). */
export function imageTimeIso(label: string | null | undefined): string | null {
  if (!label) return null;
  const hourOnly = label.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}) UTC$/);
  const t = Date.parse(hourOnly ? `${hourOnly[1]}T${hourOnly[2]}:00:00Z` : label);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Under each image: "Image from 8:55 PM (5 min ago) · Original ›", or the source's own label. */
export function ImageCaption({ label, href, prefix = 'Image from' }: { label: string | null | undefined; href?: string | null; prefix?: string }) {
  const iso = imageTimeIso(label);
  const time = iso ? receiptTime(iso) : null;
  const { ago } = freshnessOf(iso);
  return (
    <p className="text-caption text-ink-2">
      {time ? `${prefix} ${time}${ago ? ` (${ago})` : ''}` : label ? `Valid ${label}` : 'Time not published'}
      {href ? (
        <>
          {' · '}
          <a href={href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Original ›
          </a>
        </>
      ) : null}
    </p>
  );
}

/* ---- Wind -------------------------------------------------------------- */

const COMPASS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/** Degrees the wind comes FROM, from "NW" or a number. */
export function windFromDegrees(dir: string | number | null | undefined): number | null {
  if (dir === null || dir === undefined || dir === '') return null;
  if (typeof dir === 'number') return Number.isFinite(dir) ? dir : null;
  const key = dir.trim().toUpperCase();
  return key in COMPASS ? COMPASS[key] : null;
}

/** Arrow pointing where the wind blows to (a north wind points down). */
export function WindArrow({ from, className = 'h-3.5 w-3.5' }: { from: string | number | null | undefined; className?: string }) {
  const deg = windFromDegrees(from);
  if (deg === null) return null;
  return (
    <svg viewBox="0 0 12 12" className={`inline-block shrink-0 text-brown-light ${className}`} style={{ transform: `rotate(${deg + 180}deg)` }} aria-hidden="true">
      <path d="M6 1 L10 7 L7 7 L7 11 L5 11 L5 7 L2 7 Z" fill="currentColor" />
    </svg>
  );
}

/** Largest number in an NWS wind string: "10 to 15 mph" -> 15. */
export function mphOf(text: string | null | undefined): number | null {
  if (!text) return null;
  const numbers = text.match(/\d+(\.\d+)?/g);
  if (!numbers) return null;
  return Math.max(...numbers.map(Number));
}

/* ---- Next 48 hours strip ----------------------------------------------- */

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric' })
    .replace(' AM', 'A')
    .replace(' PM', 'P');
}

/**
 * The next 48 hours in 3-hour steps: a scrolling row of hours (time, temp,
 * wind arrow and speed, chance of precip), then a temperature line and wind
 * bars with the highest gust marked. From the hourly NWS forecast.
 */
export function HourlyStrip({ periods, stepHours = 3, hours = 48 }: { periods: ForecastSnippet[]; stepHours?: number; hours?: number }) {
  const cells = periods.slice(0, hours).filter((_, index) => index % stepHours === 0);
  if (cells.length === 0) return null;
  const temps = cells.map((p) => p.temperature);
  const winds = cells.map((p) => mphOf(p.windSpeed) ?? 0);
  const gusts = cells.map((p) => mphOf(p.windGust));
  return (
    <div className="space-y-3">
      <ol className="ui-scroll-x -mx-1 flex overflow-x-auto px-1" aria-label="Hourly forecast">
        {cells.map((p, index) => (
          <li
            key={p.startTime}
            className={`flex w-16 shrink-0 flex-col items-center gap-0.5 border-r border-hairline py-2 last:border-r-0 ${index === 0 ? 'rounded-control bg-yellow-soft' : ''}`}
          >
            <span className="text-tag font-bold text-ink-2">{hourLabel(p.startTime)}</span>
            <span className="text-stat font-bold tabular-nums">{p.temperature}°</span>
            <span className="flex items-center gap-0.5 text-tag font-bold text-brown">
              <WindArrow from={p.windDirection} className="h-3 w-3" />
              {mphOf(p.windSpeed) ?? '—'}
            </span>
            <span className="text-tag text-ink-3">{p.precipChance != null ? `${p.precipChance}%` : '—'}</span>
          </li>
        ))}
      </ol>
      <LineChart label="Temp °F" values={temps} />
      <WindBars winds={winds} gusts={gusts} labels={cells.map((p) => hourLabel(p.startTime))} />
    </div>
  );
}

function LineChart({ label, values }: { label: string; values: number[] }) {
  if (values.length < 2) return null;
  const w = 320;
  const h = 70;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const x = (i: number) => 24 + (i / (values.length - 1)) * (w - 32);
  const y = (v: number) => 8 + (1 - (v - min) / span) * (h - 16);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure>
      <figcaption className="text-tag font-bold uppercase tracking-label text-ink-2">{label}</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`${label}, ${min} to ${max}`}>
        {[max, Math.round((max + min) / 2), min].map((v) => (
          <g key={v}>
            <line x1="24" x2={w - 8} y1={y(v)} y2={y(v)} className="stroke-hairline" strokeWidth="1" />
            <text x="0" y={y(v) + 3} className="fill-ink-3 text-[9px]">{v}°</text>
          </g>
        ))}
        <path d={path} fill="none" className="chart-draw stroke-brand-dark" strokeWidth="2" pathLength={1} />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="2.5" className="fill-yellow stroke-brand-dark" strokeWidth="1" />
        ))}
      </svg>
    </figure>
  );
}

function WindBars({ winds, gusts, labels }: { winds: number[]; gusts: (number | null)[]; labels: string[] }) {
  if (winds.length < 2) return null;
  const w = 320;
  const h = 90;
  const top = Math.max(10, ...winds, ...gusts.map((g) => g ?? 0));
  const scale = (v: number) => (v / top) * (h - 24);
  const step = (w - 32) / winds.length;
  const maxGust = Math.max(...gusts.map((g) => g ?? 0));
  const gustAt = maxGust > 0 ? gusts.indexOf(maxGust) : -1;
  return (
    <figure>
      <figcaption className="text-tag font-bold uppercase tracking-label text-ink-2">Wind mph</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Wind up to ${Math.max(...winds)} mph${maxGust ? `, gusts to ${maxGust}` : ''}`}>
        <line x1="24" x2={w - 8} y1={h - 14} y2={h - 14} className="stroke-hairline" strokeWidth="1" />
        <text x="0" y={h - 14 - scale(top) + 3} className="fill-ink-3 text-[9px]">{top}</text>
        {winds.map((v, i) => (
          <rect
            key={i}
            x={24 + i * step + step * 0.2}
            y={h - 14 - scale(v)}
            width={step * 0.6}
            height={scale(v)}
            rx="1.5"
            className={v === Math.max(...winds) ? 'fill-brown-dark' : 'fill-brown-light'}
          />
        ))}
        {gustAt >= 0 ? (
          <text x={24 + gustAt * step + step / 2} y={h - 16 - scale(maxGust)} textAnchor="middle" className="fill-danger text-[9px] font-bold">
            gust {maxGust}
          </text>
        ) : null}
        {labels.map((label, i) =>
          i % 4 === 0 ? (
            <text key={i} x={24 + i * step + step / 2} y={h - 2} textAnchor="middle" className="fill-ink-3 text-[9px]">{label}</text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/* ---- Avalanche danger -------------------------------------------------- */

/** Official North American avalanche danger colors (tokens --color-avy-1..5). */
export const DANGER_COLORS: Record<number, string> = {
  1: 'var(--color-avy-1)',
  2: 'var(--color-avy-2)',
  3: 'var(--color-avy-3)',
  4: 'var(--color-avy-4)',
  5: 'var(--color-avy-5)',
};

export const DANGER_NAMES: Record<number, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Considerable',
  4: 'High',
  5: 'Extreme',
};

/** The numbered danger square. Uses the center's own color when it sends one. */
export function DangerBox({ level, color, size = 'md' }: { level: number | null; color?: string | null; size?: 'sm' | 'md' }) {
  const known = level !== null && level >= 1 && level <= 5;
  const fill = color || (known ? DANGER_COLORS[level] : undefined);
  const dark = level === 5 || level === 4;
  const box = size === 'sm' ? 'h-8 w-8 text-body' : 'h-11 w-11 text-stat';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-control border-2 border-ink font-bold ${box} ${known ? '' : 'bg-surface-gray text-ink-3'} ${dark ? 'text-on-dark' : 'text-ink'}`}
      style={fill ? { backgroundColor: fill } : undefined}
      aria-hidden="true"
    >
      {known ? level : '–'}
    </span>
  );
}

/** The 1-5 scale with the current level outlined. */
export function DangerScale({ level }: { level: number | null }) {
  return (
    <div className="flex overflow-hidden rounded-control border-2 border-ink" role="img" aria-label={level ? `Danger ${level} of 5, ${DANGER_NAMES[level]}` : 'No danger rating'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`flex h-8 flex-1 items-center justify-center text-meta font-bold ${n >= 4 ? 'text-on-dark' : 'text-ink'} ${n === level ? 'outline-3 -outline-offset-3 outline-ink' : 'opacity-60'}`}
          style={{ backgroundColor: DANGER_COLORS[n] }}
        >
          {n}
        </span>
      ))}
    </div>
  );
}
