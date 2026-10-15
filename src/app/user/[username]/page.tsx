import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ChallengeBadge } from '@/components/stats/ChallengeBadge';
import { Badge } from '@/components/retro/Badge';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { DeleteReport } from '@/components/posts/DeleteReport';
import { deletePhotoAction, deleteRouteAction } from '@/app/library/actions';
import { deleteClimbAction } from '@/app/peaks/actions';
import { deletePinAction } from '@/app/pins/actions';
import { deleteTripAction } from '@/app/trips/actions';
import { getViewer } from '@/app/sign-in/actions';
import { findHandleRedirect, findMemberByHandle } from '@/lib/auth/members';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { loadLoggedActivities, loadProfilePins } from '@/lib/pins';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { loadProfileLibrary } from '@/lib/posts';
import { homeStateLabel } from '@/lib/us-states';
import { allPeaks, challengeProgress, loadChallenges } from '@/lib/challenges';
import { canContribute, canDeleteOwned } from '@/lib/membership';
import { ensurePeaks, listClimbs, summitCountsByUser } from '@/lib/summits';
import { listTripsByOwner } from '@/lib/trips';
import { formatOptionalDate, formatTripDate } from '@/lib/utils';

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
  let library: Awaited<ReturnType<typeof loadProfileLibrary>> = { posts: [], routes: [], photos: [] };
  let activities: Awaited<ReturnType<typeof loadLoggedActivities>> = [];
  let pins: Awaited<ReturnType<typeof loadProfilePins>> = [];
  let summitCounts: Awaited<ReturnType<typeof summitCountsByUser>> = [];
  let climbs: Awaited<ReturnType<typeof listClimbs>> = [];
  let trips: Awaited<ReturnType<typeof listTripsByOwner>> = [];
  let error: string | null = null;
  try {
    await ensurePeaks();
    [library, activities, pins, summitCounts, climbs, trips] = await Promise.all([
      loadProfileLibrary(member.id),
      loadLoggedActivities(member.id),
      loadProfilePins(member.id),
      summitCountsByUser(),
      listClimbs(),
      listTripsByOwner(member.id),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'This page did not load.';
  }
  const canAdd = viewer?.id === member.id && canContribute(viewer.role);
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
  const ownClimbs = climbs.filter((climb) => climb.userId === member.id);
  const profilePath = `/user/${member.handle ?? username}`;

  const name = member.displayName || member.handle || 'Friend';
  const region = homeStateLabel(member.homeRegion);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={name}>
          <div className="flex items-start gap-4">
            {member.avatarUrl ? (
              <Image
                src={member.avatarUrl}
                alt=""
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
                <Button href="/settings#edit-profile" tone="yellow">Edit profile</Button>
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
        <Window title="Posts">
          {library.posts.length === 0 ? (
            <p className="text-sm text-gray-700">
              No posts yet.
              {canAdd ? <> <Link href="/upload?kind=post" className="underline">Upload one.</Link></> : null}
            </p>
          ) : (
            <ul className="space-y-2">
              {library.posts.map((post) => (
                <li key={post.id} className="space-y-2">
                  <Link href={`/posts/${post.id}`} className="font-bold underline">{post.title}</Link>
                  <span className="ml-2 text-sm text-gray-700">
                    {formatTripDate(post.tripDate)}
                    {post.activity && isActivity(post.activity) ? ` · ${ACTIVITY_META[post.activity].label}` : ''}
                    {post.tagged ? ' · tagged' : ''}
                  </span>
                  {manage && !post.tagged ? (
                    <DeleteReport id={post.id} returnTo={profilePath} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Window>
        <Window title="Routes">
          {library.routes.length === 0 ? (
            <p className="text-sm text-gray-700">
              No routes yet.
              {canAdd ? <> <Link href="/upload?kind=route" className="underline">Upload one.</Link></> : null}
            </p>
          ) : (
            <ul className="space-y-2">
              {library.routes.map((route) => (
                <li key={route.id} className="space-y-2">
                  <Link href={`/routes/${route.id}`} className="font-bold underline">
                    {route.name}
                  </Link>
                  <span className="ml-2 text-sm text-gray-700">
                    {isActivity(route.activity) ? ACTIVITY_META[route.activity].label : route.activity}
                    {route.distanceM != null ? ` · ${formatMiles(route.distanceM)}` : ''}
                    {route.elevGainM != null ? ` · ${formatFeetGain(route.elevGainM)}` : ''}
                  </span>
                  {manage ? (
                    <ConfirmDelete
                      action={deleteRouteAction}
                      label="Delete"
                      confirm="Delete this route?"
                      fields={{ id: route.id, returnTo: profilePath }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Window>
        <Window title="Pins">
          {pins.length === 0 ? (
            <p className="text-sm text-gray-700">
              No pins yet.
              {canAdd ? <> <Link href="/upload?kind=pin" className="underline">Drop one.</Link></> : null}
            </p>
          ) : (
            <ul className="space-y-2">
              {pins.map((pin) => (
                <li key={pin.id} className="space-y-2">
                  <Link href={`/pins/${pin.id}`} className="font-bold underline">{pin.title}</Link>
                  <span className="ml-2 text-sm text-gray-700">
                    {formatTripDate(pin.visitedOn)}
                    {pin.activity && isActivity(pin.activity) ? ` · ${ACTIVITY_META[pin.activity].label}` : ''}
                    {isPinKind(pin.kind) ? ` · ${PIN_KIND_LABELS[pin.kind]}` : ''}
                  </span>
                  {manage ? (
                    <ConfirmDelete
                      action={deletePinAction}
                      label="Delete"
                      confirm="Delete this pin?"
                      fields={{ id: pin.id }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Window>
        <Window title="Photos">
          {library.photos.length === 0 ? (
            <p className="text-sm text-gray-700">
              No photos yet.
              {canAdd ? <> <Link href="/upload?kind=photo" className="underline">Upload one.</Link></> : null}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {library.photos.map((photo) => (
                <figure key={photo.id} className="space-y-2">
                  <Link href={`/photos/${photo.id}`}>
                    <Image src={photo.url} alt={photo.caption || ''} width={240} height={240} className="h-28 w-full object-cover retro-box" />
                  </Link>
                  {manage ? (
                    <ConfirmDelete
                      action={deletePhotoAction}
                      label="Delete"
                      confirm="Delete this photo?"
                      fields={{ id: photo.id, returnTo: profilePath }}
                    />
                  ) : null}
                </figure>
              ))}
            </div>
          )}
        </Window>
        <Window title="Trips">
          {trips.length === 0 ? (
            <p className="text-sm text-gray-700">
              No trips planned yet.
              {canAdd ? <> <Link href="/trips/new" className="underline">Plan one.</Link></> : null}
            </p>
          ) : (
            <ul className="space-y-2">
              {trips.map((trip) => (
                <li key={trip.id} className="space-y-2">
                  <Link href={`/trips/${trip.id}`} className="font-bold underline">{trip.title}</Link>
                  <span className="ml-2 text-sm text-gray-700">{formatTripDate(trip.tripDate)}</span>
                  {manage ? (
                    <ConfirmDelete
                      action={deleteTripAction}
                      label="Delete"
                      confirm="Delete this trip?"
                      fields={{ id: trip.id }}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Window>
        <Window title="Climbs">
          {ownClimbs.length === 0 ? (
            <p className="text-sm text-gray-700">
              No climbs logged yet.
              {canAdd ? <> <Link href="/peaks" className="underline">Log one.</Link></> : null}
            </p>
          ) : (
            <ul className="space-y-2">
              {ownClimbs.map((climb) => {
                const when = formatOptionalDate(climb.climbedOn);
                return (
                  <li key={climb.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/peaks/${climb.peakSlug}`} className="font-bold underline">
                      {peakNames.get(climb.peakSlug) ?? 'Peak'}
                    </Link>
                    {when ? <span className="text-xs text-gray-500">{when}</span> : null}
                    {manage ? (
                      <ConfirmDelete
                        action={deleteClimbAction}
                        label="Delete"
                        confirm="Delete this climb?"
                        fields={{ id: climb.id, peakSlug: climb.peakSlug }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
