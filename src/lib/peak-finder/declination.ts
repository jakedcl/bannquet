import { formatCellId } from './peaks';

export type DeclinationTable = {
  v: 1;
  model: string;
  date: string;
  step: number;
  cells: Record<string, number>;
};

export function declinationCellId(lat: number, lng: number): string {
  return formatCellId(Math.floor(lat), Math.floor(lng));
}

/** Degrees to add to a magnetic heading. West declination is negative. */
export function declinationAt(table: DeclinationTable, lat: number, lng: number): number | null {
  const direct = table.cells[declinationCellId(lat, lng)];
  if (typeof direct === 'number') return direct;
  let best: number | null = null;
  let bestD = Infinity;
  const lat0 = Math.floor(lat);
  const lng0 = Math.floor(lng);
  for (let dla = -2; dla <= 2; dla += 1) {
    for (let dln = -2; dln <= 2; dln += 1) {
      const value = table.cells[formatCellId(lat0 + dla, lng0 + dln)];
      if (typeof value !== 'number') continue;
      const d = dla * dla + dln * dln;
      if (d < bestD) {
        bestD = d;
        best = value;
      }
    }
  }
  return best;
}

export async function loadDeclination(): Promise<DeclinationTable> {
  const res = await fetch('/peak-finder/declination.v1.json');
  if (!res.ok) throw new Error('The declination table did not load.');
  return res.json() as Promise<DeclinationTable>;
}
