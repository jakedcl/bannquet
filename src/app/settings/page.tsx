import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { Button } from '@/components/retro/Button';
import { StatusBar } from '@/components/retro/StatusBar';
import { Window } from '@/components/retro/Window';
import { getViewer, signOutAction } from '@/app/sign-in/actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  const params = await searchParams;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <Window title="Your profile">
          {params.welcome ? (
            <div className="mb-4">
              <StatusBar>You&apos;re in. Add your name and the sports you actually do.</StatusBar>
            </div>
          ) : null}
          <ProfileForm member={viewer} />
        </Window>
        <form action={signOutAction}>
          <Button type="submit">Sign out</Button>
        </form>
      </div>
    </PageWrapper>
  );
}
