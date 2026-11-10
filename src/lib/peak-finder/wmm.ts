/**
 * World Magnetic Model, evaluated the way NOAA's test values expect.
 * The coefficient file is downloaded by the build script and is not shipped to the phone.
 */

const WGS84_A = 6378.137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const A_REF = 6371.2;
const NMAX = 12;

export type WmmModel = {
  epoch: number;
  g: number[][];
  h: number[][];
  dg: number[][];
  dh: number[][];
};

function zeros(): number[][] {
  return Array.from({ length: NMAX + 1 }, () => Array<number>(NMAX + 1).fill(0));
}

export function parseWmmCof(text: string): WmmModel {
  const g = zeros();
  const h = zeros();
  const dg = zeros();
  const dh = zeros();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const epoch = Number(lines[0]?.split(/\s+/)[0]);
  if (!Number.isFinite(epoch)) throw new Error('WMM coefficient file has no epoch.');
  for (const line of lines.slice(1)) {
    const parts = line.split(/\s+/);
    if (parts[0] === '9999') break;
    const n = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(n) || !Number.isFinite(m) || n > NMAX) continue;
    g[n][m] = Number(parts[2]);
    h[n][m] = Number(parts[3]);
    dg[n][m] = Number(parts[4]);
    dh[n][m] = Number(parts[5]);
  }
  return { epoch, g, h, dg, dh };
}

export function decimalYear(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (end - start);
}

function atDate(model: WmmModel, year: number): { g: number[][]; h: number[][] } {
  const dt = year - model.epoch;
  const g = zeros();
  const h = zeros();
  for (let n = 0; n <= NMAX; n += 1) {
    for (let m = 0; m <= NMAX; m += 1) {
      g[n][m] = model.g[n][m] + dt * model.dg[n][m];
      h[n][m] = model.h[n][m] + dt * model.dh[n][m];
    }
  }
  return { g, h };
}

function geodeticToGeocentric(latDeg: number, heightKm: number): { r: number; delta: number; theta: number } {
  const phi = (latDeg * Math.PI) / 180;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * s * s);
  const x = (n + heightKm) * c;
  const z = (n * (1 - WGS84_E2) + heightKm) * s;
  const phic = Math.atan2(z, x);
  return { r: Math.hypot(x, z), delta: phi - phic, theta: Math.PI / 2 - phic };
}

function legendre(theta: number): { p: number[][]; d: number[][] } {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const p = zeros();
  const d = zeros();
  p[0][0] = 1;
  p[1][0] = ct;
  d[1][0] = -st;
  p[1][1] = st;
  d[1][1] = ct;
  for (let n = 2; n <= NMAX; n += 1) {
    const k = Math.sqrt((2 * n - 1) / (2 * n));
    p[n][n] = k * st * p[n - 1][n - 1];
    d[n][n] = k * (ct * p[n - 1][n - 1] + st * d[n - 1][n - 1]);
    for (let m = 0; m < n; m += 1) {
      const a2 = n - 1 >= m ? Math.sqrt((n - 1) ** 2 - m * m) : 0;
      const den = Math.sqrt(n * n - m * m);
      const p2 = n - 2 >= m ? p[n - 2][m] : 0;
      const d2 = n - 2 >= m ? d[n - 2][m] : 0;
      p[n][m] = ((2 * n - 1) * ct * p[n - 1][m] - a2 * p2) / den;
      d[n][m] = ((2 * n - 1) * (ct * d[n - 1][m] - st * p[n - 1][m]) - a2 * d2) / den;
    }
  }
  return { p, d };
}

/** North (X), east (Y) and down (Z) components in nanotesla. */
export function fieldComponents(
  g: number[][],
  h: number[][],
  latDeg: number,
  lngDeg: number,
  heightKm = 0,
): { x: number; y: number; z: number } {
  const geo = geodeticToGeocentric(latDeg, heightKm);
  const { p, d } = legendre(geo.theta);
  const rr = Array.from({ length: NMAX + 1 }, (_, n) => (A_REF / geo.r) ** (n + 2));
  const lam = (lngDeg * Math.PI) / 180;
  let br = 0;
  let bt = 0;
  let bp = 0;
  const st = Math.sin(geo.theta) || 1e-12;
  for (let m = 0; m <= NMAX; m += 1) {
    let gr = 0;
    let hr = 0;
    let gt = 0;
    let ht = 0;
    let gp = 0;
    let hp = 0;
    for (let n = Math.max(1, m); n <= NMAX; n += 1) {
      const f = rr[n];
      gr += (n + 1) * f * g[n][m] * p[n][m];
      hr += (n + 1) * f * h[n][m] * p[n][m];
      gt += f * g[n][m] * d[n][m];
      ht += f * h[n][m] * d[n][m];
      gp += f * g[n][m] * p[n][m];
      hp += f * h[n][m] * p[n][m];
    }
    const c = Math.cos(m * lam);
    const s = Math.sin(m * lam);
    br += gr * c + hr * s;
    bt -= gt * c + ht * s;
    bp -= m * (-gp * s + hp * c);
  }
  bp /= st;
  const xc = -bt;
  const zc = -br;
  const cd = Math.cos(geo.delta);
  const sd = Math.sin(geo.delta);
  return { x: xc * cd + zc * sd, y: bp, z: zc * cd - xc * sd };
}

/** Declination in degrees. East is positive, west is negative. */
export function declinationDeg(model: WmmModel, lat: number, lng: number, date: Date, heightKm = 0): number {
  const year = decimalYear(date);
  const { g, h } = atDate(model, year);
  const { x, y } = fieldComponents(g, h, lat, lng, heightKm);
  return Math.atan2(y, x) * (180 / Math.PI);
}

export type WmmTestPoint = {
  year: number;
  heightKm: number;
  lat: number;
  lng: number;
  x: number;
  y: number;
  z: number;
  declination: number;
};

export function parseWmmTests(text: string): WmmTestPoint[] {
  const points: WmmTestPoint[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const p = line.trim().split(/\s+/).map(Number);
    if (p.length < 11 || p.some((value) => Number.isNaN(value))) continue;
    points.push({
      year: p[0],
      heightKm: p[1],
      lat: p[2],
      lng: p[3],
      x: p[4],
      y: p[5],
      z: p[6],
      declination: p[10],
    });
  }
  return points;
}

/** Largest absolute error against NOAA's published test values. */
export function wmmTestError(model: WmmModel, points: readonly WmmTestPoint[]): { fieldNt: number; declinationDeg: number } {
  let fieldNt = 0;
  let declination = 0;
  for (const point of points) {
    const { g, h } = atDate(model, point.year);
    const got = fieldComponents(g, h, point.lat, point.lng, point.heightKm);
    fieldNt = Math.max(fieldNt, Math.abs(got.x - point.x), Math.abs(got.y - point.y), Math.abs(got.z - point.z));
    const dec = Math.atan2(got.y, got.x) * (180 / Math.PI);
    declination = Math.max(declination, Math.abs(dec - point.declination));
  }
  return { fieldNt, declinationDeg: declination };
}
