import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { AdminMemberTable, InviteTable } from '@/components/admin/AdminTables';
import { InviteForm } from '@/components/auth/InviteForm';
import { PendingQueue } from '@/components/auth/PendingDecision';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listInvites, listMembers } from '@/lib/auth/members';
import { inviteState } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

function formatLastSignIn(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  });
}

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath('/admin'));
  if (viewer.role !== 'admin') redirect('/');

  const [members, invites] = await Promise.all([listMembers(), listInvites()]);
  const pending = members.filter((member) => member.role === 'pending');
  const approved = members.filter((member) => member.role !== 'pending');

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Window title="Invites">
          <InviteForm />
        </Window>

        <Window title="Invite list">
          {invites.length === 0 ? (
            <p className="text-sm">No invites yet.</p>
          ) : (
            <InviteTable
              rows={invites.map((invite) => ({
                code: invite.code,
                email: invite.email ?? '—',
                status: inviteState({
                  email: invite.email,
                  expiresAt: invite.expiresAt,
                  usedAt: invite.usedAt,
                }),
              }))}
            />
          )}
        </Window>

        <PendingQueue
          members={pending.map((member) => ({
            id: member.id,
            displayName: member.displayName,
            email: member.email,
            handle: member.handle,
          }))}
        />

        <Window title="Members">
          {approved.length === 0 ? (
            <p className="text-sm">Nobody has signed in yet.</p>
          ) : (
            <AdminMemberTable
              rows={approved.map((member) => ({
                id: member.id,
                name: member.displayName || member.handle || 'Friend',
                href: member.handle ? `/user/${member.handle}` : null,
                email: member.email ?? '—',
                role: member.role,
                lastSignIn: formatLastSignIn(member.lastSignInAt),
                canReset: Boolean(member.email),
              }))}
            />
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
