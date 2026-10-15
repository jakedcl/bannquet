import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ClimbRows, Pager, PhotoGrid, PinRows, RouteRows, TripRows } from '@/components/profile/ProfileLists';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { allPeaks } from '@/lib/challenges';
import { listPage, slicePage } from '@/lib/list-page';
import { loadProfilePins } from '@/lib/pins';
import { loadProfileLibrary } from '@/lib/posts';
import { profileMember } from '@/lib/profile-member';
import { canDeleteOwned } from '@/lib/membership';
import { listClimbs } from '@/lib/summits';
import { listTripsByOwner } from '@/lib/trips';

export const dynamic = 'force-dynamic';

const SECTIONS = {
  trips: 'Trips',
  routes: 'Routes',
  pins: 'Pins',
  photos: 'Photos',
  climbs: 'Climbs',
} as const;

type Section = keyof typeof SECTIONS;

function isSection(value: string): value is Section {
  return Object.prototype.hasOwnProperty.call(SECTIONS, value);
}

export default async function ProfileSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; section: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username, section } = await params;
  if (!isSection(section)) notFound();
  const member = await profileMember(username, section);
  const viewer = await getViewer();
  const manage = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: member.id,
  }));
  const handle = member.handle ?? username;
  const path = `/user/${handle}/${section}`;
  const page = listPage((await searchParams).page);
  const name = member.displayName || member.handle || 'Friend';

  let error: string | null = null;
  let total = 0;
  let pages = 1;
  let current = 1;
  let body: ReactNode = null;

  try {
    if (section === 'trips') {
      const trips = await listTripsByOwner(member.id);
      total = trips.length;
      body = total === 0 ? <p className="text-sm">No trips yet.</p> : <TripRows trips={trips} manage={manage} />;
    } else if (section === 'routes') {
      const routes = (await loadProfileLibrary(member.id)).routes;
      total = routes.length;
      body = total === 0 ? <p className="text-sm">No routes yet.</p> : <RouteRows routes={routes} manage={manage} profilePath={`/user/${handle}`} />;
    } else if (section === 'pins') {
      const pins = await loadProfilePins(member.id);
      total = pins.length;
      body = total === 0 ? <p className="text-sm">No pins yet.</p> : <PinRows pins={pins} manage={manage} />;
    } else if (section === 'photos') {
      const sliced = slicePage((await loadProfileLibrary(member.id)).photos, page);
      total = sliced.total;
      pages = sliced.pages;
      current = sliced.page;
      body = total === 0 ? <p className="text-sm">No photos yet.</p> : <PhotoGrid photos={sliced.rows} manage={manage} profilePath={`/user/${handle}`} />;
    } else {
      const names = Object.fromEntries(allPeaks().map((peak) => [peak.slug, peak.name]));
      const climbs = (await listClimbs()).filter((climb) => climb.userId === member.id).reverse();
      total = climbs.length;
      body = total === 0 ? <p className="text-sm">No climbs yet.</p> : <ClimbRows climbs={climbs} names={names} manage={manage} />;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'This list did not load.';
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title={SECTIONS[section]}>
          <p className="mb-3 text-sm">
            <Link href={`/user/${handle}`} className="underline">{name}</Link>
          </p>
          {error ? <p className="text-sm font-bold">{error}</p> : body}
          {error || section !== 'photos' ? null : <Pager page={current} pages={pages} path={path} />}
        </Window>
      </div>
    </PageWrapper>
  );
}
