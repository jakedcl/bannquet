import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember } from '@/lib/handles';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const viewer = await getViewer();
  if (viewer) redirect(nextStopForMember(viewer));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        <Card title="Forgot password">
          <ForgotPasswordForm />
        </Card>
      </div>
    </PageWrapper>
  );
}
