import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { SectionList } from '@/components/ui/SectionList';
import { getViewer } from '@/app/sign-in/actions';
import { settingsLinks, visibleLinks } from '@/lib/sections';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  if (params.welcome) redirect('/account?welcome=1');
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath('/settings'));
  const links = visibleLinks(settingsLinks({ handle: viewer.handle, role: viewer.role }));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        {links.length > 0 ? (
          <SectionList links={links} activeHref="/settings" label="Settings" />
        ) : (
          <p className="text-sm">Profile shows up here after you pick a username.</p>
        )}
      </div>
    </PageWrapper>
  );
}
