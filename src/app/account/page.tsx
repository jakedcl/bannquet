import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { getViewer, signOutAction } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath(params.welcome ? '/account?welcome=1' : '/account'));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div id="edit-profile">
          <Window title="Account">
            {!canContribute(viewer.role) ? (
              <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
            ) : (
              <ProfileForm member={viewer} />
            )}
          </Window>
        </div>
        <form action={signOutAction}>
          <Button type="submit">Sign out</Button>
        </form>
      </div>
    </PageWrapper>
  );
}
