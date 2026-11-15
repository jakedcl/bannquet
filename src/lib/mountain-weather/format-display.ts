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