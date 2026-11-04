import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Card } from '@/components/hub/Card';
import { HubPage } from '@/components/hub/Page';
import { getViewer, signOutAction } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath(params.welcome ? '/account?welcome=1' : '/account'));

  return (
    <PageWrapper>
      <HubPage title="Account" width="lg">
        <Card id="edit-profile">
          {!canContribute(viewer.role) ? (
            <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
          ) : (
            <ProfileForm member={viewer} />
          )}
        </Card>
        <form action={signOutAction}>
          <SubmitButton pendingLabel="Signing out…">Sign out</SubmitButton>
        </form>
      </HubPage>
    </PageWrapper>
  );
}
