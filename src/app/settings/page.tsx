import { redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import { settingsHref } from '@/lib/sections';
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
  redirect(settingsHref({ handle: viewer.handle, role: viewer.role }));
}
