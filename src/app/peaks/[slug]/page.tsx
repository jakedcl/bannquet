import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { PeakCheck } from '@/components/peaks/PeakCheck';
import { getViewer } from '@/app/sign-in/actions';
import { allPeaks } from '@/lib/challenges';
import { viewerCanContribute } from '@/lib/membership';
import { listPeakVisitors, type PeakRow } from '@/lib/summits';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';

// Dynamic because it reads the viewer's cookie; the visitor list itself is cached (listPeakVisitors).
export const dynamic = 'force-dynamic';

const AREAS: Record<string, string> = {
  cat3500: 'Catskills, NY',
  adk46: 'Adirondacks, NY',
  nh48: 'New Hampshire',
  vt4000: 'Vermont',
  me4000: 'Maine',
};

const LISTS: Record<string, string> = {
  cat3500: 'Catskill 3500',
  adk46: 'Adirondack 46',
  nh48: 'New Hampshire 48',
  vt4000: 'Vermont 4000',
  me4000: 'Maine 4000',
};

export default async function PeakPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const peak = allPeaks().find((item) => item.slug === slug);
  if (!peak) notFound();
  const list = LISTS[peak.listId] ?? peak.listId;
  const areaName = AREAS[peak.listId] ?? 'Northeast';
  // "New Hampshire · New Hampshire 48" says the state twice.
  const area = list.startsWith(areaName) ? null : areaName;

  const viewer = await getViewer();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so who has been here cannot be loaded.';
  let people: PeakRow[] = [];
  if (ready) {
    try {
      people = await listPeakVisitors(peak.slug);
    } catch (err) {
      error = loadFailed('peak page', err, 'Who has been here did not load. Try again in a minute.');
    }
  }

  const canMark = Boolean(!error && viewerCanContribute(viewer));
  const mine = Boolean(viewer && people.some((person) => person.userId === viewer.id));
  const visitors = [...people].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={peak.name}>
          <p className="text-sm text-gray-700">
            {[
              `${peak.elevationFt.toLocaleString('en-US')} ft`,
              area,
              list,
            ].filter(Boolean).join(' · ')}
          </p>
          {peak.note ? <p className="mt-2 text-sm">{peak.note}</p> : null}
          <p className="mt-3 text-sm">
            <Link href="/peaks" className="underline">All peaks</Link>
          </p>
          {error ? <p className="mt-3 text-sm font-bold">{error}</p> : null}
        </Window>

        <Window title="Who has been here">
          {visitors.length === 0 ? (
            <p className="text-sm text-gray-700">Nobody yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {visitors.map((person) => (
                <li key={person.userId}>
                  {person.handle ? <Link href={`/user/${person.handle}`} className="underline">{person.name}</Link> : person.name}
                </li>
              ))}
            </ul>
          )}
          {canMark ? (
            <div className="mt-4">
              <PeakCheck peakSlug={peak.slug} added={mine} />
            </div>
          ) : mine ? (
            <p className="mt-4 text-sm font-bold">✓ In your peaks</p>
          ) : null}
        </Window>
      </div>
    </PageWrapper>
  );
}
