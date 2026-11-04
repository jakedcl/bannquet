import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { GearAddButton } from '@/components/gear/GearAddForm';
import { GearTable } from '@/components/gear/GearTable';
import { getViewer } from '@/app/sign-in/actions';
import { listGear } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute, viewerCanContribute } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';

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
      error = loadFailed('gear list', err, 'The gear list did not load. Try again in a minute.');
    }
  }
  const canEdit = Boolean(!error && viewerCanContribute(viewer));

  return (
    <PageWrapper>
      <HubPage title="Gear" width="3xl" trailing={canEdit ? <GearAddButton /> : null}>
        <Card>
          {error ? <p className="mb-3 text-sm font-bold">{error}</p> : null}
          {viewer && !canContribute(viewer.role) ? <p className="mb-3 text-sm font-bold">{APPROVAL_WAIT}</p> : null}
          {error ? null : (
            <GearTable
              items={items}
              canEdit={canEdit}
              viewer={viewer ? { id: viewer.id, role: viewer.role } : null}
            />
          )}
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
