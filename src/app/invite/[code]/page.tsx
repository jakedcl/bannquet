import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { CreateAccountForm } from '@/components/auth/CreateAccountForm';
import { Card } from '@/components/hub/Card';
import { getInviteByCode } from '@/lib/auth/members';
import { inviteState } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';
import { issueSignupStamp } from '@/lib/signup-guard';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper>
        <HubPage title="Invite" width="lg">
          <Card>
            <p>Invites are not connected yet.</p>
          </Card>
        </HubPage>
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
      <HubPage title="You're invited" width="lg">
        <Card>
          {state === 'open' && invite.email ? (
            <CreateAccountForm email={invite.email} inviteCode={invite.code} stamp={issueSignupStamp()} />
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
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
