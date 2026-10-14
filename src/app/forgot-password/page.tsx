import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember } from '@/lib/handles';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const viewer = await getViewer();
  if (viewer) redirect(nextStopForMember(viewer));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        <Window title="Forgot password">
          <ForgotPasswordForm />
        </Window>
      </div>
    </PageWrapper>
  );
}
