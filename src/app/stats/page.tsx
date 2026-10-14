import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { ChallengeBadge } from '@/components/stats/ChallengeBadge';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';
import { toggleSummit } from '@/app/stats/actions';
import { getViewer } from '@/app/sign-in/actions';
import { listMembers } from '@/lib/auth/members';
import { challengeProgress, loadChallenges } from '@/lib/challenges';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { LEADER_GROUPS, buildLeaderboards, type LeaderStat } from '@/lib/leaderboard';
import { canContribute } from '@/lib/membership';
import { ensurePeaks, listSummitCredits, summitCountsByActivity, summitCountsByUser } from '@/lib/summits';
import { trackTotals } from '@/lib/trips';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const challenges = loadChallenges();
  const viewer = await getViewer();
  const canMark = Boolean(viewer && canContribute(viewer.role));
  const ready = isDatabaseConfigured();
  if (ready) await ensurePeaks();

  const [members, counts, credits, totals, summitActivities] = ready
    ? await Promise.all([
      listMembers(),
      summitCountsByUser(),
      viewer ? listSummitCredits(viewer.id) : Promise.resolve([]),
      trackTotals(),
      summitCountsByActivity(),
    ])
    : [[], [], [], [], []];

  const crew = members.filter((member) => member.role !== 'pending');
  const creditSet = new Set(credits.map((credit) => credit.peakSlug));
  const fromRoute = new Set(credits.filter((credit) => credit.fromRoute).map((credit) => credit.peakSlug));
  const countFor = (userId: string, listId: string) =>
    counts.find((row) => row.userId === userId && row.listId === listId)?.count ?? 0;

  const names = new Map(crew.map((member) => [member.id, {
    name: member.displayName || member.handle || 'Friend',
    handle: member.handle,
  }]));
  const stats = new Map<string, LeaderStat>();
  const keyFor = (userId: string, activity: string) => `${userId}:${activity}`;
  for (const row of totals) {
    const person = names.get(row.userId);
    if (!person) continue;
    stats.set(keyFor(row.userId, row.activity), {
      userId: row.userId,
      name: person.name,
      handle: person.handle,
      activity: row.activity,
      distanceM: row.distanceM,
      elevGainM: row.elevGainM,
      summits: 0,
    });
  }
  for (const row of summitActivities) {
    const person = names.get(row.userId);
    if (!person) continue;
    const key = keyFor(row.userId, row.activity);
    const current = stats.get(key) ?? {
      userId: row.userId,
      name: person.name,
      handle: person.handle,
      activity: row.activity,
      distanceM: 0,
      elevGainM: 0,
      summits: 0,
    };
    current.summits += row.count;
    stats.set(key, current);
  }
  const boards = buildLeaderboards([...stats.values()]);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Window title="Challenges">
          <p className="mb-4 text-sm text-gray-700">
            A route counts when it passes within about 500 feet of the summit. You can also mark one by hand.
          </p>
          {crew.length === 0 ? (
            <p className="text-sm">Nobody is on the list yet.</p>
          ) : (
            <Table
              headers={['Name', ...challenges.map((challenge) => challenge.short)]}
              rows={crew.map((member) => [
                member.handle ? (
                  <Link key={member.id} href={`/user/${member.handle}`} className="underline">
                    {member.displayName || member.handle}
                  </Link>
                ) : (member.displayName || 'Friend'),
                ...challenges.map((challenge) => {
                  const progress = challengeProgress(challenge.peaks.length, countFor(member.id, challenge.id));
                  return (
                    <span key={challenge.id} className="inline-flex items-center gap-2">
                      {progress.climbed} / {progress.total}
                      {progress.complete ? <ChallengeBadge short={challenge.short} /> : null}
                    </span>
                  );
                }),
              ])}
            />
          )}
        </Window>

        {canMark && viewer ? challenges.map((challenge) => {
          const climbed = challenge.peaks.filter((peak) => creditSet.has(peak.slug)).length;
          const progress = challengeProgress(challenge.peaks.length, climbed);
          return (
            <Window key={challenge.id} title={challenge.name}>
              <p className="mb-3 text-sm font-bold">
                {progress.climbed} / {progress.total}
                {progress.complete ? <span className="ml-3"><ChallengeBadge short={challenge.short} /></span> : null}
              </p>
              <ul className="space-y-1">
                {challenge.peaks.map((peak) => {
                  const done = creditSet.has(peak.slug);
                  return (
                    <li key={peak.slug} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {peak.name}
                        <span className="ml-2 text-gray-600">{peak.elevationFt.toLocaleString('en-US')} ft</span>
                        {done && fromRoute.has(peak.slug) ? <span className="ml-2 text-gray-600">from a route</span> : null}
                      </span>
                      <form action={toggleSummit}>
                        <input type="hidden" name="peakSlug" value={peak.slug} />
                        <button type="submit" className="retro-button rounded-none px-2 py-1 text-xs font-bold uppercase">
                          {done ? 'Climbed' : 'I climbed this'}
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </Window>
          );
        }) : null}

        {LEADER_GROUPS.map((group) => (
          <Window key={group.id} title={group.label}>
            {boards[group.id].length === 0 ? (
              <p className="text-sm">No {group.label.toLowerCase()} miles yet.</p>
            ) : (
              <Table
                headers={['Name', 'Miles', 'Elevation', 'Summits']}
                rows={boards[group.id].map((row) => [
                  row.handle ? <Link key={row.userId} href={`/user/${row.handle}`} className="underline">{row.name}</Link> : row.name,
                  formatMiles(row.distanceM),
                  formatFeetGain(row.elevGainM),
                  String(row.summits),
                ])}
              />
            )}
          </Window>
        ))}
      </div>
    </PageWrapper>
  );
}
