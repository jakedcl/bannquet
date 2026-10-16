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

type ProfileSectionData =
  | { kind: 'trips'; total: number; pages: number; page: number; trips: Awaited<ReturnType<typeof listTripsByOwner>> }
  | { kind: 'routes'; total: number; pages: number; page: number; routes: Awaited<ReturnType<typeof loadProfileLibrary>>['routes'] }
  | { kind: 'pins'; total: number; pages: number; page: number; pins: Awaited<ReturnType<typeof loadProfilePins>> }
  | { kind: 'photos'; total: number; pages: number; page: number; photos: Awaited<ReturnType<typeof loadProfileLibrary>>['photos'] }
  | { kind: 'climbs'; total: number; pages: number; page: number; climbs: Awaited<ReturnType<typeof listClimbs>>; names: Record<string, string> };

async function loadProfileSection(section: Section, memberId: string, page: number): Promise<ProfileSectionData> {
  if (section === 'trips') {
    const trips = await listTripsByOwner(memberId);
    return { kind: 'trips', trips, total: trips.length, pages: 1, page: 1 };
  }
  if (section === 'routes') {
    const routes = (await loadProfileLibrary(memberId)).routes;
    return { kind: 'routes', routes, total: routes.length, pages: 1, page: 1 };
  }
  if (section === 'pins') {
    const pins = await loadProfilePins(memberId);
    return { kind: 'pins', pins, total: pins.length, pages: 1, page: 1 };
  }
  if (section === 'photos') {
    const sliced = slicePage((await loadProfileLibrary(memberId)).photos, page);
    return { kind: 'photos', photos: sliced.rows, total: sliced.total, pages: sliced.pages, page: sliced.page };
  }
  const names = Object.fromEntries(allPeaks().map((peak) => [peak.slug, peak.name]));
  const climbs = (await listClimbs()).filter((climb) => climb.userId === memberId).reverse();
  return { kind: 'climbs', climbs, names, total: climbs.length, pages: 1, page: 1 };
}

function sectionBody(loaded: ProfileSectionData, manage: boolean, handle: string): ReactNode {
  if (loaded.total === 0) return <p className="text-sm">No {loaded.kind} yet.</p>;
  if (loaded.kind === 'trips') return <TripRows trips={loaded.trips} manage={manage} />;
  if (loaded.kind === 'routes') return <RouteRows routes={loaded.routes} manage={manage} profilePath={`/user/${handle}`} />;
  if (loaded.kind === 'pins') return <PinRows pins={loaded.pins} manage={manage} />;
  if (loaded.kind === 'photos') return <PhotoGrid photos={loaded.photos} manage={manage} profilePath={`/user/${handle}`} />;
  return <ClimbRows climbs={loaded.climbs} names={loaded.names} manage={manage} />;
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
  let loaded: ProfileSectionData | null = null;

  try {
    loaded = await loadProfileSection(section, member.id, page);
  } catch (err) {
    error = err instanceof Error ? err.message : 'This list did not load.';
  }

  const body = loaded ? sectionBody(loaded, manage, handle) : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title={SECTIONS[section]}>
          <p className="mb-3 text-sm">
            <Link href={`/user/${handle}`} className="underline">{name}</Link>
          </p>
          {error ? <p className="text-sm font-bold">{error}</p> : body}
          {error || loaded?.kind !== 'photos' ? null : <Pager page={loaded.page} pages={loaded.pages} path={path} />}
        </Window>
      </div>
    </PageWrapper>
  );
}
