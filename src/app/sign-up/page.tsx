import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember } from '@/lib/handles';
import { safeNextPath } from '@/lib/sign-in-next';
import { issueSignupStamp } from '@/lib/signup-guard';

export const dynamic = 'force-dynamic';

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const viewer = await getViewer();
  if (viewer) redirect(next ?? nextStopForMember(viewer));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        <Window title="Make an account">
          <SignUpForm stamp={issueSignupStamp()} next={next ?? ''} />
        </Window>
      </div>
    </PageWrapper>
  );
}
