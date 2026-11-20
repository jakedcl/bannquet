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
