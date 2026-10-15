import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { NewTripForm } from '@/components/trips/NewTripForm';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

export default async function NewTripPage() {
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath('/trips/new'));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Window title="New trip">
          {canContribute(viewer.role) ? <NewTripForm /> : <p className="text-sm font-bold">{APPROVAL_WAIT}</p>}
        </Window>
      </div>
    </PageWrapper>
  );
}
