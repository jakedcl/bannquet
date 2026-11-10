import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { CountControl } from '@/components/ui/CountControl';
import { Card } from '@/components/hub/Card';
import { changeHoldAction, deleteGearHoldAction, deleteGearItemAction, updateGearItemAction } from '@/app/gear/actions';
import { ConfirmDelete } from '@/components/delete/ConfirmDelete';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { adminPowerActing, adminPowerLabel } from '@/lib/admin-ui';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { getGearItem } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute, canDeleteOwned, canEditOwned, viewerCanContribute } from '@/lib/membership';
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
  const canManageItem = Boolean(viewer && canEditOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: item.addedBy,
  }));
  const itemAdminPower = Boolean(viewer && adminPowerActing({
    role: viewer.role,
    actorId: viewer.id,
    ownerId: item.addedBy,
  }));

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
          {canManageItem ? (
            <EditDetails adminPower={itemAdminPower}>
              <EditForm
                key={`${item.name}\n${item.category ?? ''}`}
                action={updateGearItemAction}
                adminPower={itemAdminPower}
                hidden={{ id: item.id }}
                fields={[
                  { name: 'name', label: 'Name', value: item.name, maxLength: 80 },
                  { name: 'category', label: 'Category', value: item.category ?? '', maxLength: 40 },
                ]}
              />
            </EditDetails>
          ) : null}
          {canManageItem ? (
            <div className="mt-4">
              <ConfirmDelete
                look="hub"
                text="Remove item"
                action={deleteGearItemAction}
                confirm="Remove this item from the list?"
                adminPower={itemAdminPower}
                label={itemAdminPower ? adminPowerLabel('Remove gear item').ariaLabel : undefined}
                fields={{ id: item.id }}
              />
            </div>
          ) : null}
        </Card>
        <Card title="Who has it">
          {item.holds.length === 0 ? (
            <p className="text-sm text-gray-700">Nobody has marked this yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {item.holds.map((hold) => {
                const holdAdmin = Boolean(viewer && adminPowerActing({
                  role: viewer.role,
                  actorId: viewer.id,
                  ownerId: hold.userId,
                }));
                const canRemoveHold = Boolean(viewer && canDeleteOwned({
                  actorRole: viewer.role,
                  actorId: viewer.id,
                  ownerId: hold.userId,
                }));
                return (
                  <li key={hold.userId} className="flex items-center justify-between gap-2">
                    <span>
                      {hold.handle ? <Link href={`/user/${hold.handle}`} className="underline">{hold.name}</Link> : hold.name}
                      <span className="text-gray-700"> × {hold.qty}</span>
                    </span>
                    {canRemoveHold ? (
                      <ConfirmDelete
                        look="hub"
                        text="Remove"
                        action={deleteGearHoldAction}
                        confirm="Remove this mark?"
                        adminPower={holdAdmin}
                        label={holdAdmin ? adminPowerLabel('Remove gear mark').ariaLabel : undefined}
                        fields={{ gearId: item.id, userId: hold.userId }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
