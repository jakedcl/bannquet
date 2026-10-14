import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { CreateAccountForm } from '@/components/auth/CreateAccountForm';
import { Window } from '@/components/retro/Window';
import { getInviteByCode } from '@/lib/auth/members';
import { inviteState } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper>
        <div className="page-shell page-pad mx-auto max-w-lg">
          <Window title="Invite">
            <p>Invites are not connected yet.</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  const invite = await getInviteByCode(code);
  if (!invite) notFound();
  const state = inviteState({
    email: invite.email,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt,
  });

  return (
    <PageWrapper>
      <div className="page-shell page-pad mx-auto max-w-lg">
        <Window title="You're invited">
          {state === 'open' && invite.email ? (
            <CreateAccountForm email={invite.email} inviteCode={invite.code} />
          ) : null}
          {state === 'used' ? (
            <p className="text-sm">
              This invite was already used.{' '}
              <Link href="/sign-in" className="font-bold underline">
                Sign in
              </Link>{' '}
              with the same email.
            </p>
          ) : null}
          {state === 'expired' ? <p className="text-sm">This invite expired. Ask Jake for a new one.</p> : null}
          {state === 'open' && !invite.email ? (
            <p className="text-sm">This invite is missing an email. Ask Jake to send a new one.</p>
          ) : null}
        </Window>
      </div>
    </PageWrapper>
  );
}
