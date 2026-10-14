import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SignInForm } from '@/components/auth/SignInForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  invite: 'That sign-in is not on the invite list. Ask Jake for a link.',
  setup: 'Sign-in is not connected yet.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer?.handle) redirect(`/hikers/${viewer.handle}`);

  const params = await searchParams;
  const banner = params.error ? ERRORS[params.error] : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        <Window title="Sign in">
          {params.reset === '1' ? (
            <p className="mb-4 text-sm text-brand-green-dark">Password saved. Sign in with it.</p>
          ) : null}
          {banner ? <p className="mb-4 text-sm font-bold text-red-700">{banner}</p> : null}
          <SignInForm intro="Use the email and password you chose from Jake's invite. You stay signed in on this browser." />
        </Window>
      </div>
    </PageWrapper>
  );
}
