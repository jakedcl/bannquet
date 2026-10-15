import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { GearAddButton } from '@/components/gear/GearAddForm';
import { GearTable } from '@/components/gear/GearTable';
import { getViewer } from '@/app/sign-in/actions';
import { listGear } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';

export const dynamic = 'force-dynamic';

export default async function GearPage() {
  const viewer = await getViewer();
  const ready = isDatabaseConfigured();
  let error: string | null = ready ? null : 'Postgres is not connected, so the gear list cannot load.';
  let items: Awaited<ReturnType<typeof listGear>> = [];
  if (ready) {
    try {
      items = await listGear();
    } catch (err) {
      error = err instanceof Error ? err.message : 'The gear list did not load.';
    }
  }
  const canEdit = Boolean(!error && (!viewer || canContribute(viewer.role)));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title="Gear" action={canEdit ? <GearAddButton /> : null}>
          {error ? <p className="mb-3 text-sm font-bold">{error}</p> : null}
          {viewer && !canContribute(viewer.role) ? <p className="mb-3 text-sm font-bold">{APPROVAL_WAIT}</p> : null}
          {error ? null : (
            <GearTable
              items={items}
              canEdit={canEdit}
              viewer={viewer ? { id: viewer.id, role: viewer.role } : null}
            />
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
