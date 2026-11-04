import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SignInForm } from '@/components/auth/SignInForm';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember, profileNeedsNames } from '@/lib/handles';
import { safeNextPath } from '@/lib/sign-in-next';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  invite: 'That sign-in is not on the list yet. Make an account, or ask Jake for a link.',
  setup: 'Sign-in is not connected yet.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const viewer = await getViewer();
  if (viewer) {
    if (profileNeedsNames(viewer)) redirect('/account?welcome=1');
    redirect(next ?? nextStopForMember(viewer));
  }

  const banner = params.error ? ERRORS[params.error] : null;

  return (
    <PageWrapper>
      <HubPage title="Sign in" width="lg">
        <Card>
          {banner ? <p className="mb-4 text-sm font-bold text-red-700">{banner}</p> : null}
          <SignInForm next={next ?? ''} />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
