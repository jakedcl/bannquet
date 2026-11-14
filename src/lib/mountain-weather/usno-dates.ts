const ET = 'America/New_York';

export function usnoDateEt(day: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: 'numeric', day: 'numeric' }).format(day);
}

export function usnoEtDatesThrough(anchor: Date, count: number): string[] {
  const first = usnoDateEt(anchor);
  const [y, m, d] = first.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const dt = new Date(base);
    dt.setUTCDate(base.getUTCDate() + i);
    out.push(`${dt.getUTCFullYear()}-${dt.getUTCMonth() + 1}-${dt.getUTCDate()}`);
  }
  return out;
}

export function formatEtLabel(dateEt: string): string {
  return `${dateEt} (ET)`;
}