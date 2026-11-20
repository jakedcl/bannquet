const ET: Intl.DateTimeFormatOptions = {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

/** Eastern time label for an ISO timestamp (stable for SSR + client). */
export function formatEt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString('en-US', ET)} ET`;
}

/** Friendly relative age for a measured report (minutes). */
export function formatObservationAge(ageMinutes: number | null | undefined): string {
  if (ageMinutes == null) return 'observation time unknown';
  if (ageMinutes < 1) return 'just now';
  if (ageMinutes === 1) return '1 min ago';
  if (ageMinutes < 60) return `${ageMinutes} min ago`;
  const hours = Math.round(ageMinutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}
/** "06:46" or "16:15" (USNO 24-hour clock) -> "6:46 AM" / "4:15 PM"; anything else unchanged. */
export function formatClock12(clock: string | null | undefined): string | null {
  if (!clock) return null;
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return clock;
  const h = Number(m[1]);
  if (h > 23) return clock;
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Standard-atmosphere cooling, about 3.5°F per 1,000 ft. A rule of thumb, said as "about". */
const LAPSE_F_PER_FT = 3.5 / 1000;

/**
 * The NWS grid cell has one elevation; the place may sit above or below it. Says so in plain
 * words: "Forecast is for 5,650 ft. The summit is 638 ft higher, so expect about 2° colder."
 */
export function gridElevationNote(gridFt: number | null | undefined, placeFt: number | null | undefined, isBase: boolean): string | null {
  if (gridFt == null || !Number.isFinite(gridFt)) return null;
  const grid = `${Math.round(gridFt).toLocaleString('en-US')} ft`;
  if (placeFt == null || !Number.isFinite(placeFt)) return `Forecast is for ${grid}.`;
  const what = isBase ? 'This spot' : 'The summit';
  const diff = Math.round(placeFt - gridFt);
  const degrees = Math.round(Math.abs(diff) * LAPSE_F_PER_FT);
  if (Math.abs(diff) < 300 || degrees === 0) return `Forecast is for ${grid}, close to ${what.toLowerCase()} (${Math.round(placeFt).toLocaleString('en-US')} ft).`;
  const higher = diff > 0;
  return `Forecast is for ${grid}. ${what} is ${Math.abs(diff).toLocaleString('en-US')} ft ${higher ? 'higher' : 'lower'}, so expect about ${degrees}° ${higher ? 'colder' : 'warmer'}.`;
}

/** "PRESIDENTIAL RANGE FORECAST AREA" -> "Presidential Range Forecast Area"; mixed case is left alone. */
export function tidyLabel(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  if (/[a-z]/.test(t)) return t;
  return t.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bFt\b/g, 'ft');
}

/**
 * NWS text products wrap at about 66 columns. Join those wrapped lines into paragraphs so the
 * text reflows on a phone; blank lines stay paragraph breaks and list lines ("-", "*", "+")
 * start a new line. The exact original stays one tap away on the source line.
 */
export function reflowProductText(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((para) =>
      para
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce<string[]>((out, line) => {
          if (out.length === 0 || /^[-*+•]\s/.test(line)) out.push(line);
          else out[out.length - 1] += ` ${line}`;
          return out;
        }, [])
        .join('\n'),
    )
    .filter(Boolean);
}

/** ".AVIATION /00Z FRIDAY THROUGH TUESDAY/..." -> "Aviation (00Z Friday through Tuesday)". */
export function discussionHeading(title: string): string {
  const inner = title.replace(/^\./, '').replace(/\.\.\.\s*$/, '').trim();
  const m = inner.match(/^([^/]+?)\s*\/(.+)\/\s*$/);
  const head = tidyLabel(m ? m[1] : inner) ?? inner;
  const when = m ? m[2].trim().toLowerCase().replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g, (d) => d[0].toUpperCase() + d.slice(1)).replace(/\b(\d+)z\b/g, '$1Z') : null;
  const sentence = (head.charAt(0) + head.slice(1).toLowerCase()).replace(
    /\b(btv|aly|gyx|car|box|okx|nws)\b/gi,
    (code) => code.toUpperCase(),
  );
  return when ? `${sentence} (${when})` : sentence;
}
