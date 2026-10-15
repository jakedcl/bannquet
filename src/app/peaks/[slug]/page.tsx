import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { Window } from '@/components/retro/Window';
import { deleteClimbAction, logClimbAction, removeLatestClimbAction } from '@/app/peaks/actions';
import { getViewer } from '@/app/sign-in/actions';
import { allPeaks } from '@/lib/challenges';
import { canContribute } from '@/lib/membership';
import { listClimbs, type ClimbRow } from '@/lib/summits';
import { isDatabaseConfigured } from '@/db';

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

  const viewer = await getViewer();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so climbs cannot be loaded.';
  let climbs: ClimbRow[] = [];
  if (ready) {
    try {
      climbs = (await listClimbs()).filter((climb) => climb.peakSlug === peak.slug);
    } catch (err) {
      error = err instanceof Error ? err.message : 'The climbs did not load.';
    }
  }

  const canMark = Boolean(!error && (!viewer || canContribute(viewer.role)));
  const own = viewer ? climbs.filter((climb) => climb.userId === viewer.id) : [];
  const people = climberSummary(climbs);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={peak.name}>
          <p className="text-sm text-gray-700">
            {peak.elevationFt.toLocaleString('en-US')} ft
            {' · '}
            {AREAS[peak.listId] ?? 'Northeast'}
            {' · '}
            {LISTS[peak.listId] ?? peak.listId}
          </p>
          {peak.winter ? <p className="mt-2 text-sm">The club wants this one again in winter. Log that as another climb.</p> : null}
          {peak.note ? <p className="mt-2 text-sm">{peak.note}</p> : null}
          <p className="mt-3 text-sm">
            <Link href="/peaks" className="underline">All peaks</Link>
          </p>
          {error ? <p className="mt-3 text-sm font-bold">{error}</p> : null}
        </Window>

        <Window title="Who climbed it">
          {people.length === 0 ? (
            <p className="text-sm text-gray-700">No climbs logged.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {people.map((person) => (
                <li key={person.userId}>
                  {person.handle ? <Link href={`/user/${person.handle}`} className="underline">{person.name}</Link> : person.name}
                  {person.times > 1 ? ` ×${person.times}` : ''}
                </li>
              ))}
            </ul>
          )}
          {canMark && own.length === 0 ? (
            <form action={logClimbAction} className="mt-4">
              <input type="hidden" name="peakSlug" value={peak.slug} />
              <button type="submit" className="retro-button-yellow rounded-none px-3 py-2 text-xs font-bold uppercase">
                I climbed this
              </button>
            </form>
          ) : null}
          {canMark && own.length > 0 ? (
            <div className="mt-4 flex items-center gap-2">
              <form action={removeLatestClimbAction}>
                <input type="hidden" name="peakSlug" value={peak.slug} />
                <button type="submit" aria-label="Remove a climb" className="retro-button-yellow inline-flex h-8 w-8 items-center justify-center rounded-none p-0 text-lg font-bold">
                  −
                </button>
              </form>
              <p className="min-w-0 flex-1 truncate text-sm font-bold">You&apos;ve climbed this {own.length}×</p>
              <form action={logClimbAction}>
                <input type="hidden" name="peakSlug" value={peak.slug} />
                <button type="submit" aria-label="Log another climb" className="retro-button-yellow inline-flex h-8 w-8 items-center justify-center rounded-none p-0 text-lg font-bold">
                  +
                </button>
              </form>
            </div>
          ) : null}
          {own.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {[...own].reverse().map((climb, index) => (
                <li key={climb.id} className="flex items-center gap-2 text-sm">
                  <p className="min-w-0 flex-1 truncate">Climb {own.length - index}</p>
                  <ConfirmDelete
                    action={deleteClimbAction}
                    confirm="Delete this climb?"
                    fields={{ id: climb.id, peakSlug: peak.slug }}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </Window>
      </div>
    </PageWrapper>
  );
}

function climberSummary(climbs: ClimbRow[]) {
  const map = new Map<string, { userId: string; name: string; handle: string | null; times: number }>();
  for (const climb of climbs) {
    const current = map.get(climb.userId) ?? {
      userId: climb.userId,
      name: climb.name,
      handle: climb.handle,
      times: 0,
    };
    current.times += 1;
    map.set(climb.userId, current);
  }
  return [...map.values()].sort((a, b) => b.times - a.times || a.name.localeCompare(b.name));
}
