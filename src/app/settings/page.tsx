import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { Button } from '@/components/retro/Button';
import { StatusBar } from '@/components/retro/StatusBar';
import { Window } from '@/components/retro/Window';
import { getViewer, signOutAction } from '@/app/sign-in/actions';
import { profileNeedsNames } from '@/lib/handles';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath(params.welcome ? '/settings?welcome=1' : '/settings'));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div id="edit-profile">
          <Window title="Edit profile">
            {!canContribute(viewer.role) ? (
              <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
            ) : (
              <>
                {params.welcome || profileNeedsNames(viewer) ? (
                  <div className="mb-4">
                    <StatusBar>
                      {viewer.handle
                        ? 'Add a display name. Your username stays the one you picked.'
                        : 'Add a display name and a username. The username is the address of your page.'}
                    </StatusBar>
                  </div>
                ) : null}
                <ProfileForm member={viewer} />
              </>
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
