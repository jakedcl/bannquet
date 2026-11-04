import PageWrapper from '@/components/ui/PageWrapper';
import { PeaksTable, type PeakTableRow } from '@/components/peaks/PeaksTable';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { allPeaks } from '@/lib/challenges';
import { viewerCanContribute } from '@/lib/membership';
import { listPeakRows } from '@/lib/summits';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';

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
  let error: string | null = ready ? null : 'Postgres is not connected, so peak counts stay at zero.';
  const counts = new Map<string, number>();
  const mine = new Map<string, number>();

  if (ready) {
    try {
      for (const row of await listPeakRows()) {
        counts.set(row.peakSlug, (counts.get(row.peakSlug) ?? 0) + 1);
        if (viewer && row.userId === viewer.id) mine.set(row.peakSlug, row.count);
      }
    } catch (err) {
      error = loadFailed('peaks list', err, 'The peak counts did not load. Try again in a minute.');
    }
  }

  const rows: PeakTableRow[] = allPeaks().map((peak) => ({
    slug: peak.slug,
    name: peak.name,
    elevationFt: peak.elevationFt,
    state: STATES[peak.listId] ?? '—',
    visitors: counts.get(peak.slug) ?? 0,
    mine: mine.get(peak.slug) ?? 0,
  }));

  return (
    <PageWrapper>
      <HubPage title="Peaks" width="5xl">
        <Card>
          {error ? <p className="mb-4 text-sm font-bold">{error}</p> : null}
          <PeaksTable rows={rows} canMark={Boolean(!error && viewerCanContribute(viewer))} />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
