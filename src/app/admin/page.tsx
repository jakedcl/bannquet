import Link from 'next/link';
import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { InviteForm } from '@/components/auth/InviteForm';
import { PendingDecision } from '@/components/auth/PendingDecision';
import { ResetMemberPassword } from '@/components/auth/ResetMemberPassword';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { listInvites, listMembers } from '@/lib/auth/members';
import { inviteState } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  if (viewer.role !== 'admin') redirect('/');

  const [members, invites] = await Promise.all([listMembers(), listInvites()]);
  const pending = members.filter((member) => member.role === 'pending');
  const approved = members.filter((member) => member.role !== 'pending');

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Window title="Invites">
          <p className="mb-4 text-sm">
            Type a friend&apos;s email. You get a page link to text them. They choose a password there.
            Only that email can make an account.
          </p>
          <InviteForm />
        </Window>

        <Window title="Invite list">
          {invites.length === 0 ? (
            <p className="text-sm">No invites yet.</p>
          ) : (
            <Table
              headers={['Email', 'Status', 'Link']}
              rows={invites.map((invite) => {
                const state = inviteState({
                  email: invite.email,
                  expiresAt: invite.expiresAt,
                  usedAt: invite.usedAt,
                });
                return [
                  invite.email ?? '—',
                  state,
                  <Link key={invite.code} href={`/invite/${invite.code}`} className="underline">
                    /invite/{invite.code}
                  </Link>,
                ];
              })}
            />
          )}
        </Window>

        <Window title={pending.length > 0 ? `Waiting (${pending.length})` : 'Waiting'}>
          {pending.length === 0 ? (
            <p className="text-sm">Nobody is waiting for approval.</p>
          ) : (
            <Table
              headers={['Name', 'Email', 'Username', 'Decision']}
              rows={pending.map((member) => [
                member.displayName || 'Friend',
                member.email ?? '—',
                member.handle ? `@${member.handle}` : '—',
                <PendingDecision key={member.id} userId={member.id} />,
              ])}
            />
          )}
        </Window>

        <Window title="Members">
          {approved.length === 0 ? (
            <p className="text-sm">Nobody has signed in yet.</p>
          ) : (
            <Table
              headers={['Name', 'Email', 'Role', 'Password']}
              rows={approved.map((member) => [
                member.handle ? (
                  <Link key={member.id} href={`/user/${member.handle}`} className="underline">
                    {member.displayName || member.handle}
                  </Link>
                ) : (
                  member.displayName || 'Friend'
                ),
                member.email ?? '—',
                member.role,
                member.email ? <ResetMemberPassword key={member.id} userId={member.id} /> : '—',
              ])}
            />
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
