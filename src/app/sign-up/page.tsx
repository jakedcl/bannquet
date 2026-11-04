import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember } from '@/lib/handles';
import { safeNextPath } from '@/lib/sign-in-next';
import { issueSignupStamp } from '@/lib/signup-guard';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const viewer = await getViewer();
  if (viewer) redirect(next ?? nextStopForMember(viewer));

  return (
    <PageWrapper>
      <HubPage title="Make an account" width="lg">
        <Card>
          <SignUpForm stamp={issueSignupStamp()} next={next ?? ''} />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
