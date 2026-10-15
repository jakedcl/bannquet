import PageWrapper from '@/components/ui/PageWrapper';
import { MembersTable } from '@/components/members/MembersTable';
import { Window } from '@/components/retro/Window';
import { isDatabaseConfigured } from '@/db';
import { listApprovedMembers } from '@/lib/members-directory';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so the member list is empty.';
  let rows: Awaited<ReturnType<typeof listApprovedMembers>> = [];

  if (ready) {
    try {
      rows = await listApprovedMembers();
    } catch (err) {
      error = err instanceof Error ? err.message : 'The member list did not load.';
    }
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Window title="Members">
          {error ? (
            <p className="text-sm font-bold">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm">No approved members yet.</p>
          ) : (
            <MembersTable rows={rows} />
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
