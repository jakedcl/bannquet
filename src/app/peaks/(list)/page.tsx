import PageWrapper from '@/components/ui/PageWrapper';
import { PeaksTable, type PeakTableRow } from '@/components/peaks/PeaksTable';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { allPeaks } from '@/lib/challenges';
import { canContribute } from '@/lib/membership';
import { listClimbs } from '@/lib/summits';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';

export const dynamic = 'force-dynamic';

const STATES: Record<string, string> = {
  cat3500: 'NY',
  adk46: 'NY',
  nh48: 'NH',
  vt4000: 'VT',
  me4000: 'ME',
};

export default async function PeaksPage() {
  const viewer = await getViewer();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so climb counts stay at zero.';
  const counts = new Map<string, number>();
  const mine = new Map<string, number>();

  if (ready) {
    try {
      const climbs = await listClimbs();
      for (const climb of climbs) {
        counts.set(climb.peakSlug, (counts.get(climb.peakSlug) ?? 0) + 1);
        if (viewer && climb.userId === viewer.id) mine.set(climb.peakSlug, (mine.get(climb.peakSlug) ?? 0) + 1);
      }
    } catch (err) {
      error = loadFailed('peaks list', err, 'The climb counts did not load. Try again in a minute.');
    }
  }

  const rows: PeakTableRow[] = allPeaks().map((peak) => ({
    slug: peak.slug,
    name: peak.name,
    elevationFt: peak.elevationFt,
    state: STATES[peak.listId] ?? '—',
    climbs: counts.get(peak.slug) ?? 0,
    mine: mine.get(peak.slug) ?? 0,
  }));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Window title="Peaks">
          {error ? <p className="mb-4 text-sm font-bold">{error}</p> : null}
          <PeaksTable rows={rows} canMark={Boolean(!error && (!viewer || canContribute(viewer.role)))} />
        </Window>
      </div>
    </PageWrapper>
  );
}
