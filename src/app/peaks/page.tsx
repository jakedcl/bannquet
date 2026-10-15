import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { ChallengeBadge } from '@/components/stats/ChallengeBadge';
import { Button } from '@/components/retro/Button';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';
import { deleteClimbAction, logClimbAction } from '@/app/peaks/actions';
import { getViewer } from '@/app/sign-in/actions';
import { listMembers } from '@/lib/auth/members';
import { challengeProgress, climbButtonLabel, groupPeaks, loadChallenges, loadGroups, type Challenge, type ChallengePeak } from '@/lib/challenges';
import { canContribute } from '@/lib/membership';
import { ensurePeaks, listClimbs, summitCountsByUser, type ClimbRow } from '@/lib/summits';
import { formatOptionalDate } from '@/lib/utils';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function PeaksPage() {
  const challenges = loadChallenges();
  const groups = loadGroups();
  const viewer = await getViewer();
  const canMark = Boolean(viewer && canContribute(viewer.role));
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so climbs cannot be loaded.';
  let climbs: ClimbRow[] = [];
  let counts: Awaited<ReturnType<typeof summitCountsByUser>> = [];
  let members: Awaited<ReturnType<typeof listMembers>> = [];

  if (ready) {
    try {
      await ensurePeaks();
      [climbs, counts, members] = await Promise.all([
        listClimbs(),
        summitCountsByUser(),
        listMembers(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'The peak lists did not load.';
    }
  }

  const crew = members.filter((member) => member.role !== 'pending');
  const byPeak = new Map<string, ClimbRow[]>();
  for (const climb of climbs) {
    const list = byPeak.get(climb.peakSlug) ?? [];
    list.push(climb);
    byPeak.set(climb.peakSlug, list);
  }
  const countFor = (userId: string, listId: string) =>
    counts.find((row) => row.userId === userId && row.listId === listId)?.count ?? 0;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Window title="Peaks">
          <p className="text-sm text-gray-700">
            Northeast lists. A summit counts when you log it. The date is optional.
            Miles and the activity boards stay on <Link href="/stats" className="underline">stats</Link>.
          </p>
          {error ? <p className="mt-3 text-sm font-bold">{error}</p> : null}
        </Window>

        {challenges.map((challenge) => (
          <ChallengeBlock
            key={challenge.id}
            challenge={challenge}
            crew={crew}
            byPeak={byPeak}
            countFor={countFor}
            viewerId={viewer?.id ?? null}
            canMark={canMark && !error}
          />
        ))}

        {groups.map((group) => {
          const total = groupPeaks(group).length;
          const climbedFor = (userId: string) => group.listIds.reduce((sum, listId) => sum + countFor(userId, listId), 0);
          const yours = viewer ? challengeProgress(total, climbedFor(viewer.id)) : null;
          const board = crew
            .map((member) => ({ member, count: climbedFor(member.id) }))
            .filter((row) => row.count > 0)
            .sort((a, b) => b.count - a.count || labelOf(a.member).localeCompare(labelOf(b.member)));
          return (
            <Window key={group.id} title={group.name}>
              <p className="mb-3 text-sm text-gray-700">
                These peaks are already listed in {group.listIds.map((id, index) => {
                  const challenge = challenges.find((item) => item.id === id);
                  return (
                    <span key={id}>
                      {index > 0 ? ', ' : ''}
                      <a href={`#${id}`} className="underline">{challenge?.name ?? id}</a>
                    </span>
                  );
                })}.
                The count is those lists together, without a second copy of each peak.
              </p>
              {yours ? (
                <p className="mb-3 text-sm font-bold">
                  You: {yours.climbed} / {yours.total}
                  {yours.complete ? <span className="ml-3"><ChallengeBadge short={group.short} /></span> : null}
                </p>
              ) : null}
              {board.length === 0 ? (
                <p className="text-sm">Nobody has logged a climb here yet.</p>
              ) : (
                <Table
                  headers={['Name', 'Peaks']}
                  rows={board.map((row) => [
                    personLink(row.member),
                    `${row.count} / ${total}`,
                  ])}
                />
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {group.listIds.map((id) => {
                  const challenge = challenges.find((item) => item.id === id);
                  return <Button key={id} href={`#${id}`}>{challenge?.short ?? id}</Button>;
                })}
              </div>
            </Window>
          );
        })}
      </div>
    </PageWrapper>
  );
}

function ChallengeBlock({
  challenge,
  crew,
  byPeak,
  countFor,
  viewerId,
  canMark,
}: {
  challenge: Challenge;
  crew: Awaited<ReturnType<typeof listMembers>>;
  byPeak: Map<string, ClimbRow[]>;
  countFor: (userId: string, listId: string) => number;
  viewerId: string | null;
  canMark: boolean;
}) {
  const yours = viewerId ? challengeProgress(challenge.peaks.length, countFor(viewerId, challenge.id)) : null;
  const board = crew
    .map((member) => ({ member, count: countFor(member.id, challenge.id) }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || labelOf(a.member).localeCompare(labelOf(b.member)));

  return (
    <Window title={challenge.name}>
      <div id={challenge.id} className="scroll-mt-24">
        {challenge.id === 'cat3500' ? (
          <p className="mb-3 text-sm text-gray-700">
            Thirty-five peaks, including Graham and Doubletop, which are closed to the public.
            The club also wants Slide, Blackhead, Balsam, and Panther again in winter. Log that as another climb.
          </p>
        ) : null}
        {yours ? (
          <p className="mb-3 text-sm font-bold">
            You: {yours.climbed} / {yours.total}
            {yours.complete ? <span className="ml-3"><ChallengeBadge short={challenge.short} /></span> : null}
          </p>
        ) : (
          <p className="mb-3 text-sm font-bold">{challenge.peaks.length} peaks</p>
        )}
        {board.length === 0 ? (
          <p className="mb-4 text-sm">Nobody has logged a climb here yet.</p>
        ) : (
          <div className="mb-4">
            <Table
              headers={['Name', 'Peaks']}
              rows={board.map((row) => [personLink(row.member), `${row.count} / ${challenge.peaks.length}`])}
            />
          </div>
        )}
        <ul className="space-y-4">
          {challenge.peaks.map((peak) => (
            <PeakRow
              key={peak.slug}
              peak={peak}
              climbs={byPeak.get(peak.slug) ?? []}
              viewerId={viewerId}
              canMark={canMark}
            />
          ))}
        </ul>
      </div>
    </Window>
  );
}

function PeakRow({
  peak,
  climbs,
  viewerId,
  canMark,
}: {
  peak: ChallengePeak;
  climbs: ClimbRow[];
  viewerId: string | null;
  canMark: boolean;
}) {
  const people = climberSummary(climbs);
  const own = viewerId ? climbs.filter((climb) => climb.userId === viewerId) : [];

  return (
    <li className="border-t border-gray-300 pt-3 text-sm">
      <p>
        <span className="font-bold">{peak.name}</span>
        <span className="ml-2 text-gray-600">{peak.elevationFt.toLocaleString('en-US')} ft</span>
        {peak.winter ? <span className="ml-2 text-xs uppercase text-gray-600">Winter</span> : null}
        {peak.note ? <span className="ml-2 text-xs text-gray-600">{peak.note}</span> : null}
      </p>
      {people.length === 0 ? (
        <p className="mt-1 text-gray-600">No climbs logged.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {people.map((person) => (
            <li key={person.userId}>
              {person.handle ? <Link href={`/user/${person.handle}`} className="underline">{person.name}</Link> : person.name}
              {person.times > 1 ? ` ×${person.times}` : ''}
              {person.dates.length > 0 ? (
                <span className="ml-2 text-xs text-gray-500">{person.dates.join(' · ')}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canMark ? (
        <form action={logClimbAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="peakSlug" value={peak.slug} />
          <input
            type="date"
            name="climbedOn"
            aria-label="Date, optional"
            className="w-28 bg-white px-1 py-1 text-xs retro-box-inset"
          />
          <button type="submit" className="retro-button rounded-none px-2 py-1 text-xs font-bold uppercase">
            {climbButtonLabel(own.length)}
          </button>
        </form>
      ) : null}
      {own.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {own.map((climb) => {
            const when = formatOptionalDate(climb.climbedOn);
            return (
              <li key={climb.id} className="flex flex-wrap items-center gap-2">
                {when ? <span className="text-xs text-gray-500">{when}</span> : null}
                <ConfirmDelete
                  action={deleteClimbAction}
                  label="Delete"
                  confirm="Delete this climb?"
                  fields={{ id: climb.id }}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function climberSummary(climbs: ClimbRow[]): Array<{ userId: string; name: string; handle: string | null; times: number; dates: string[] }> {
  const map = new Map<string, { userId: string; name: string; handle: string | null; times: number; dates: string[] }>();
  for (const climb of climbs) {
    const current = map.get(climb.userId) ?? {
      userId: climb.userId,
      name: climb.name,
      handle: climb.handle,
      times: 0,
      dates: [],
    };
    current.times += 1;
    const when = formatOptionalDate(climb.climbedOn);
    if (when) current.dates.push(when);
    map.set(climb.userId, current);
  }
  return [...map.values()].sort((a, b) => b.times - a.times || a.name.localeCompare(b.name));
}

function labelOf(member: { displayName: string | null; handle: string | null }): string {
  return member.displayName || member.handle || 'Friend';
}

function personLink(member: { id: string; displayName: string | null; handle: string | null }) {
  const name = labelOf(member);
  return member.handle ? <Link href={`/user/${member.handle}`} className="underline">{name}</Link> : name;
}
