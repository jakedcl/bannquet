import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SignInForm } from '@/components/auth/SignInForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { nextStopForMember, profileNeedsNames } from '@/lib/handles';
import { safeNextPath } from '@/lib/sign-in-next';

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
      <div className="mx-auto max-w-lg px-4 py-10">
        <Window title="Sign in">
          {banner ? <p className="mb-4 text-sm font-bold text-red-700">{banner}</p> : null}
          <SignInForm next={next ?? ''} />
        </Window>
      </div>
    </PageWrapper>
  );
}
