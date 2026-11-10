import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { CountControl } from '@/components/ui/CountControl';
import { Card } from '@/components/hub/Card';
import { changeHoldAction, updateGearItemAction } from '@/app/gear/actions';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { getGearItem } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute, canEditOwned, viewerCanContribute } from '@/lib/membership';
import { loadFailed } from '@/lib/load-error';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GearItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper>
        <HubPage title="Gear" width="3xl">
          <Card>
            <p className="text-sm font-bold">Postgres is not connected, so this gear item cannot be loaded.</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }

  let item: Awaited<ReturnType<typeof getGearItem>> = null;
  let error: string | null = null;
  try {
    item = await getGearItem(id);
  } catch (err) {
    error = loadFailed('gear item', err, 'That item did not load. Try again in a minute.');
  }
  if (error) {
    return (
      <PageWrapper>
        <HubPage title="Gear" width="3xl">
          <Card>
            <p className="text-sm font-bold">{error}</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }
  if (!item) notFound();

  const viewer = await getViewer();
  const canEdit = viewerCanContribute(viewer);
  const mine = viewer ? item.holds.find((hold) => hold.userId === viewer.id)?.qty ?? 0 : 0;
  const total = item.holds.reduce((sum, hold) => sum + hold.qty, 0);

  return (
    <PageWrapper leaf={item.name}>
      <HubPage title={item.name} width="3xl" subtitle={`${item.category || 'No category'} · ${total} total`}>
        <Card>
          {viewer && !canContribute(viewer.role) ? <p className="mb-3 text-sm font-bold">{APPROVAL_WAIT}</p> : null}
          {canEdit ? (
            <div className="mb-4">
              <CountControl
                count={mine}
                zeroLabel="I have this"
                addLabel="Add one"
                removeLabel="Remove one"
                add={{ action: changeHoldAction, fields: { gearId: item.id, delta: '1' } }}
                remove={{ action: changeHoldAction, fields: { gearId: item.id, delta: '-1' } }}
              />
            </div>
          ) : null}
          {viewer && canEditOwned({ actorRole: viewer.role, actorId: viewer.id, ownerId: item.addedBy }) ? (
            <EditDetails>
              <EditForm
                key={`${item.name}\n${item.category ?? ''}`}
                action={updateGearItemAction}
                hidden={{ id: item.id }}
                fields={[
                  { name: 'name', label: 'Name', value: item.name, maxLength: 80 },
                  { name: 'category', label: 'Category', value: item.category ?? '', maxLength: 40 },
                ]}
              />
            </EditDetails>
          ) : null}
        </Card>
        <Card title="Who has it">
          {item.holds.length === 0 ? (
            <p className="text-sm text-gray-700">Nobody has marked this yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {item.holds.map((hold) => (
                <li key={hold.userId}>
                  {hold.handle ? <Link href={`/user/${hold.handle}`} className="underline">{hold.name}</Link> : hold.name}
                  <span className="text-gray-700"> × {hold.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
