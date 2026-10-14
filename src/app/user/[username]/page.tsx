import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ProfileAdds } from '@/components/posts/ProfileAdds';
import { ChallengeBadge } from '@/components/stats/ChallengeBadge';
import { Badge } from '@/components/retro/Badge';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { findMemberByHandle } from '@/lib/auth/members';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { loadProfileLibrary } from '@/lib/posts';
import { REGION_LABELS, isRegionCode } from '@/lib/regions';
import { challengeProgress, loadChallenges } from '@/lib/challenges';
import { canContribute } from '@/lib/membership';
import { ensurePeaks, summitCountsByUser } from '@/lib/summits';
import { formatTripDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const member = await findMemberByHandle(username);
  if (!member) notFound();
  const viewer = await getViewer();
  const library = await loadProfileLibrary(member.id);
  const challenges = loadChallenges();
  await ensurePeaks();
  const summitCounts = await summitCountsByUser();
  const canAdd = viewer?.id === member.id && canContribute(viewer.role);

  const name = member.displayName || member.handle || 'Friend';
  const region = member.homeRegion && isRegionCode(member.homeRegion) ? REGION_LABELS[member.homeRegion] : null;

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
                className="retro-box h-[88px] w-[88px] object-cover"
              />
            ) : (
              <div className="retro-box flex h-[88px] w-[88px] items-center justify-center bg-beige text-2xl font-bold">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-gray-600">@{member.handle}</p>
              {region ? <p className="text-sm">Home: {region}</p> : null}
            </div>
          </div>
          {member.bio ? <p className="mt-4 whitespace-pre-wrap text-sm">{member.bio}</p> : null}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide">Favorite activities</p>
            {member.favoriteActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {member.favoriteActivities.map((activity) => (
                  <Badge key={activity}>{ACTIVITY_META[activity].label}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No favorite activities yet.</p>
            )}
          </div>
        </Window>
        <Window title="Challenges">
          <div className="flex flex-wrap gap-4">
            {challenges.map((challenge) => {
              const climbed = summitCounts.find((row) => row.userId === member.id && row.listId === challenge.id)?.count ?? 0;
              const progress = challengeProgress(challenge.peaks.length, climbed);
              return (
                <div key={challenge.id} className="space-y-1">
                  <p className="text-sm font-bold">{challenge.short}</p>
                  <p className="text-sm">{progress.climbed} / {progress.total}</p>
                  {progress.complete ? <ChallengeBadge short={challenge.short} /> : null}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm">
            <Link href="/stats" className="underline">All the lists and the leaderboards</Link>
          </p>
        </Window>
        {canAdd ? (
          <Window title="Add to your map">
            <p className="mb-3 text-sm text-gray-700">
              A route or a photo added here is the same thing as one inside a post. Both show on the map.
            </p>
            <ProfileAdds />
          </Window>
        ) : null}
        <Window title="Posts">
          {library.posts.length === 0 ? (
            <p className="text-sm text-gray-700">No posts yet.</p>
          ) : (
            <ul className="space-y-2">
              {library.posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/posts/${post.id}`} className="font-bold underline">{post.title}</Link>
                  <span className="ml-2 text-sm text-gray-700">
                    {formatTripDate(post.tripDate)}
                    {post.activity && isActivity(post.activity) ? ` · ${ACTIVITY_META[post.activity].label}` : ''}
                    {post.tagged ? ' · tagged' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Window>
        <Window title="Routes">
          {library.routes.length === 0 ? (
            <p className="text-sm text-gray-700">No routes yet.</p>
          ) : (
            <ul className="space-y-2">
              {library.routes.map((route) => (
                <li key={route.id}>
                  <Link href={route.postId ? `/posts/${route.postId}` : `/map?track=${route.id}`} className="font-bold underline">
                    {route.name}
                  </Link>
                  <span className="ml-2 text-sm text-gray-700">
                    {isActivity(route.activity) ? ACTIVITY_META[route.activity].label : route.activity}
                    {route.distanceM != null ? ` · ${formatMiles(route.distanceM)}` : ''}
                    {route.elevGainM != null ? ` · ${formatFeetGain(route.elevGainM)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Window>
        <Window title="Photos">
          {library.photos.length === 0 ? (
            <p className="text-sm text-gray-700">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {library.photos.map((photo) => (
                <Link key={photo.id} href={photo.postId ? `/posts/${photo.postId}` : `/map?photo=${photo.id}`}>
                  <Image src={photo.url} alt={photo.caption || ''} width={240} height={240} className="h-28 w-full object-cover retro-box" />
                </Link>
              ))}
            </div>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
