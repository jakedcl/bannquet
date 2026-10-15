import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { NewTripForm } from '@/components/trips/NewTripForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { listChatCatalog } from '@/lib/chat';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';
import { presetFromCatalog } from '@/lib/trip-draft';

export const dynamic = 'force-dynamic';

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string | string[]; route?: string | string[]; photo?: string | string[] }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath('/trips/new'));
  const catalog = isDatabaseConfigured() ? await listChatCatalog().catch(() => []) : [];
  const preset = presetFromCatalog(catalog, params);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Window title="New trip">
          {canContribute(viewer.role) ? (
            <NewTripForm viewerId={viewer.id} catalog={catalog} preset={preset} />
          ) : (
            <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
