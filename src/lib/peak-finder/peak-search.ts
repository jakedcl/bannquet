import { normalizeName, loadChunks, loadPeakIndex, type Peak } from './peaks';

let catalog: Peak[] | null = null;
let catalogPromise: Promise<Peak[]> | null = null;

/** All US peaks from shipped chunks. Cached in memory after the first search. */
export function loadPeakCatalog(): Promise<Peak[]> {
  if (catalog) return Promise.resolve(catalog);
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const index = await loadPeakIndex();
      const ids = index.chunks.map((chunk) => chunk.id);
      catalog = await loadChunks(ids);
      return catalog;
    })();
  }
  return catalogPromise;
}

export function searchPeaks(peaks: readonly Peak[], query: string, limit = 8): Peak[] {
  const needle = normalizeName(query);
  if (needle.length < 2) return [];
  const matches: Peak[] = [];
  for (const peak of peaks) {
    if (normalizeName(peak.name).includes(needle)) matches.push(peak);
  }
  matches.sort((a, b) => {
    const na = normalizeName(a.name);
    const nb = normalizeName(b.name);
    const rank = (name: string) => {
      if (name === needle) return 0;
      const mount = `mount ${needle}`;
      if (name === mount || name.startsWith(`${mount} `)) return 1;
      if (name.split(' ').some((word) => word.startsWith(needle))) return 2;
      if (name.startsWith(needle)) return 3;
      return 4;
    };
    const byRank = rank(na) - rank(nb);
    if (byRank !== 0) return byRank;
    const elev = (b.elevationM ?? -1) - (a.elevationM ?? -1);
    if (elev !== 0) return elev;
    return a.name.localeCompare(b.name);
  });
  return matches.slice(0, limit);
}
