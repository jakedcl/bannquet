import PageWrapper from '@/components/ui/PageWrapper';
import { MembersTable } from '@/components/members/MembersTable';
import { Card } from '@/components/hub/Card';
import { isDatabaseConfigured } from '@/db';
import { listApprovedMembers } from '@/lib/members-directory';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so the member list is empty.';
  let rows: Awaited<ReturnType<typeof listApprovedMembers>> = [];

  if (ready) {
    try {
      rows = await listApprovedMembers();
    } catch (err) {
      error = loadFailed('members', err, 'The member list did not load. Try again in a minute.');
    }
  }

  return (
    <PageWrapper>
      <HubPage title="Members" width="5xl">
        <Card>
          {error ? (
            <p className="text-sm font-bold">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm">No approved members yet.</p>
          ) : (
            <MembersTable rows={rows} />
          )}
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
