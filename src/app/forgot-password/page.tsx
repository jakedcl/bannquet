import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember } from '@/lib/handles';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const viewer = await getViewer();
  if (viewer) redirect(nextStopForMember(viewer));

  return (
    <PageWrapper>
      <HubPage title="Forgot password" width="lg">
        <Card>
          <ForgotPasswordForm />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
