import { AvatarImage } from '@/components/ui/AvatarImage';
import { notFound, redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ClimbRows, GearRows, PhotoGrid, PinRows, RouteRows, SeeAll, TripRows } from '@/components/profile/ProfileLists';
import { ChallengeBadge } from '@/components/stats/ChallengeBadge';
import { Badge } from '@/components/retro/Badge';
import { Button } from '@/components/retro/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Window } from '@/components/retro/Window';
import { getViewer, signOutAction } from '@/app/sign-in/actions';
import { findHandleRedirect, findMemberByHandle } from '@/lib/auth/members';
import { ACTIVITY_META } from '@/lib/activities';
import { loadLoggedActivities, loadProfilePins } from '@/lib/pins';
import { loadProfileLibrary } from '@/lib/posts';
import { homeStateLabel } from '@/lib/us-states';
import { allPeaks, challengeProgress, loadChallenges } from '@/lib/challenges';
import { canDeleteOwned } from '@/lib/membership';
import { PROFILE_PREVIEW } from '@/lib/list-page';
import { ensurePeaks, listClimbs, summitCountsByUser } from '@/lib/summits';
import { listGear } from '@/lib/gear';
import { listTripsByOwner } from '@/lib/trips';
import { loadFailed } from '@/lib/load-error';

export const dynamic = 'force-dynamic';

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const member = await findMemberByHandle(username);
  if (!member) {
    const nextHandle = await findHandleRedirect(username);
    if (nextHandle) redirect(`/user/${nextHandle}`);
    notFound();
  }
  const viewer = await getViewer();
  const challenges = loadChallenges();
  let library: Awaited<ReturnType<typeof loadProfileLibrary>> = { routes: [], photos: [] };
  let activities: Awaited<ReturnType<typeof loadLoggedActivities>> = [];
  let pins: Awaited<ReturnType<typeof loadProfilePins>> = [];
  let summitCounts: Awaited<ReturnType<typeof summitCountsByUser>> = [];
  let climbs: Awaited<ReturnType<typeof listClimbs>> = [];
  let trips: Awaited<ReturnType<typeof listTripsByOwner>> = [];
  let gear: Awaited<ReturnType<typeof listGear>> = [];
  let error: string | null = null;
  try {
    await ensurePeaks();
    [library, activities, pins, summitCounts, climbs, trips, gear] = await Promise.all([
      loadProfileLibrary(member.id),
      loadLoggedActivities(member.id),
      loadProfilePins(member.id),
      summitCountsByUser(),
      listClimbs(),
      listTripsByOwner(member.id),
      listGear().catch(() => []),
    ]);
  } catch (err) {
    error = loadFailed('profile', err, 'This page did not load. Try again in a minute.');
  }
  const manage = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: member.id,
  }));
  const peakNames = new Map(allPeaks().map((peak) => [peak.slug, peak.name]));
  const startedChallenges = challenges.flatMap((challenge) => {
    const climbed = summitCounts.find((row) => row.userId === member.id && row.listId === challenge.id)?.count ?? 0;
    if (climbed < 1) return [];
    return [{ challenge, progress: challengeProgress(challenge.peaks.length, climbed) }];
  });
  const ownClimbs = climbs.filter((climb) => climb.userId === member.id).reverse();
  const heldGear = gear.flatMap((item) => {
    const hold = item.holds.find((row) => row.userId === member.id);
    if (!hold) return [];
    return [{ id: item.id, name: item.name, qty: hold.qty }];
  });
  const profilePath = `/user/${member.handle ?? username}`;

  const name = member.displayName || member.handle || 'Friend';
  const region = homeStateLabel(member.homeRegion);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={name}>
          <div className="flex items-start gap-4">
            {member.avatarUrl ? (
              <AvatarImage
                src={member.avatarUrl}
                width={88}
                height={88}
                className="avatar-frame h-[88px] w-[88px] object-cover"
              />
            ) : (
              <div className="avatar-frame flex h-[88px] w-[88px] items-center justify-center bg-beige text-2xl font-bold">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">@{member.handle}</p>
              {activities.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {activities.map((activity) => (
                    <Badge key={activity}>{ACTIVITY_META[activity].label}</Badge>
                  ))}
                </div>
              ) : null}
              {region ? <p className="text-sm">Home: {region}</p> : null}
              {viewer?.id === member.id ? (
                <Button href="/account#edit-profile" tone="yellow">Edit profile</Button>
              ) : null}
            </div>
          </div>
          {member.bio ? <p className="mt-4 whitespace-pre-wrap text-sm">{member.bio}</p> : null}
        </Window>
        {error ? (
          <Window title="Could not load">
            <p className="text-sm font-bold">{error}</p>
          </Window>
        ) : null}
        {startedChallenges.length > 0 ? (
          <Window title="Challenges">
            <div className="flex flex-wrap gap-4">
              {startedChallenges.map(({ challenge, progress }) => (
                <div key={challenge.id} className="space-y-1">
                  <p className="text-sm font-bold">{challenge.short}</p>
                  <p className="text-sm">{progress.climbed} / {progress.total}</p>
                  {progress.complete ? <ChallengeBadge short={challenge.short} /> : null}
                </div>
              ))}
            </div>
          </Window>
        ) : null}
        {library.routes.length > 0 ? (
          <Window title="Routes">
            <RouteRows routes={library.routes} manage={manage} profilePath={profilePath} collapsed />
          </Window>
        ) : null}
        {pins.length > 0 ? (
          <Window title="Pins">
            <PinRows pins={pins} manage={manage} collapsed />
          </Window>
        ) : null}
        {library.photos.length > 0 ? (
          <Window title="Photos">
            <PhotoGrid photos={library.photos.slice(0, PROFILE_PREVIEW)} manage={manage} profilePath={profilePath} />
            <SeeAll href={`${profilePath}/photos`} total={library.photos.length} />
          </Window>
        ) : null}
        {trips.length > 0 ? (
          <Window title="Trips">
            <TripRows trips={trips} manage={manage} collapsed />
          </Window>
        ) : null}
        {ownClimbs.length > 0 ? (
          <Window title="Climbs">
            <ClimbRows climbs={ownClimbs} names={Object.fromEntries(peakNames)} manage={manage} collapsed />
          </Window>
        ) : null}
        {heldGear.length > 0 ? (
          <Window title="Gear">
            <GearRows items={heldGear} collapsed />
          </Window>
        ) : null}
        {viewer?.id === member.id ? (
          <form action={signOutAction}>
            <SubmitButton pendingLabel="Signing out…">Log out</SubmitButton>
          </form>
        ) : null}
      </div>
    </PageWrapper>
  );
}
