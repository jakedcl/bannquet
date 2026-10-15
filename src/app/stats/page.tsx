import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { ChallengeBadge } from '@/components/stats/ChallengeBadge';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';
import { listMembers } from '@/lib/auth/members';
import { challengeProgress, loadChallenges } from '@/lib/challenges';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { LEADER_GROUPS, buildLeaderboards, type LeaderStat } from '@/lib/leaderboard';
import { ensurePeaks, summitCountsByActivity, summitCountsByUser } from '@/lib/summits';
import { trackTotals } from '@/lib/trips';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const challenges = loadChallenges();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so the numbers cannot load.';
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  let counts: Awaited<ReturnType<typeof summitCountsByUser>> = [];
  let totals: Awaited<ReturnType<typeof trackTotals>> = [];
  let summitActivities: Awaited<ReturnType<typeof summitCountsByActivity>> = [];

  if (ready) {
    try {
      await ensurePeaks();
      [members, counts, totals, summitActivities] = await Promise.all([
        listMembers(),
        summitCountsByUser(),
        trackTotals(),
        summitCountsByActivity(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'The stats did not load.';
    }
  }

  const crew = members.filter((member) => member.role !== 'pending');
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
        {error ? (
          <Window title="Stats">
            <p className="text-sm font-bold">{error}</p>
          </Window>
        ) : null}
        <Window title="Challenges">
          <p className="mb-4 text-sm text-gray-700">
            Summits count when someone logs them on the <Link href="/peaks" className="underline">peaks page</Link>.
            Miles and elevation come from routes.
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
