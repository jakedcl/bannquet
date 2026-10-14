import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember } from '@/lib/handles';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const viewer = await getViewer();
  if (viewer) redirect(nextStopForMember(viewer));

  return (
    <PageWrapper>
      <div className="page-shell page-pad mx-auto max-w-lg">
        <Window title="Make an account">
          <SignUpForm />
        </Window>
      </div>
    </PageWrapper>
  );
}
