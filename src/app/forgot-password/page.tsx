import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const viewer = await getViewer();
  if (viewer?.handle) redirect(`/hikers/${viewer.handle}`);

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
