import PageWrapper from '@/components/ui/PageWrapper';
import { PeaksTable, type PeakTableRow } from '@/components/peaks/PeaksTable';
import { Window } from '@/components/retro/Window';
import { allPeaks, loadChallenges } from '@/lib/challenges';
import { listClimbs } from '@/lib/summits';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

const AREAS: Record<string, string> = {
  cat3500: 'Catskills, NY',
  adk46: 'Adirondacks, NY',
  nh48: 'New Hampshire',
  vt4000: 'Vermont',
  me4000: 'Maine',
};

export default async function PeaksPage() {
  const challenges = loadChallenges();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so climb counts stay at zero.';
  const counts = new Map<string, number>();

  if (ready) {
    try {
      const climbs = await listClimbs();
      for (const climb of climbs) counts.set(climb.peakSlug, (counts.get(climb.peakSlug) ?? 0) + 1);
    } catch (err) {
      error = err instanceof Error ? err.message : 'The climb counts did not load.';
    }
  }

  const rows: PeakTableRow[] = allPeaks()
    .map((peak) => ({
      slug: peak.slug,
      name: peak.name,
      elevationFt: peak.elevationFt,
      listId: peak.listId,
      listName: challenges.find((item) => item.id === peak.listId)?.name ?? peak.listId,
      area: AREAS[peak.listId] ?? 'Northeast',
      climbs: counts.get(peak.slug) ?? 0,
    }))
    .sort((a, b) => b.climbs - a.climbs || a.name.localeCompare(b.name));

  const areas = [...new Set(rows.map((row) => row.area))];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Window title="Peaks">
          <p className="mb-4 text-sm text-gray-700">
            Northeast peaks worth a day. Climbs counts every log, including a repeat.
          </p>
          {error ? <p className="mb-4 text-sm font-bold">{error}</p> : null}
          <PeaksTable
            rows={rows}
            areas={areas}
            lists={challenges.map((item) => ({ id: item.id, name: item.name }))}
          />
        </Window>
      </div>
    </PageWrapper>
  );
}
