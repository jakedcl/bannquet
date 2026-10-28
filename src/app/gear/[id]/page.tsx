import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { CountControl } from '@/components/ui/CountControl';
import { Window } from '@/components/retro/Window';
import { changeHoldAction, updateGearItemAction } from '@/app/gear/actions';
import { EditDetails, EditForm } from '@/components/edit/EditForm';
import { getViewer } from '@/app/sign-in/actions';
import { isDatabaseConfigured } from '@/db';
import { listGear } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute, canEditOwned } from '@/lib/membership';
import { loadFailed } from '@/lib/load-error';

export const dynamic = 'force-dynamic';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GearItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id) || !isDatabaseConfigured()) notFound();

  let item: Awaited<ReturnType<typeof listGear>>[number] | null = null;
  let error: string | null = null;
  try {
    item = (await listGear()).find((row) => row.id === id) ?? null;
  } catch (err) {
    error = loadFailed('gear item', err, 'That item did not load. Try again in a minute.');
  }
  if (error) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Window title="Gear">
            <p className="text-sm font-bold">{error}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }
  if (!item) notFound();

  const viewer = await getViewer();
  const canEdit = !viewer || canContribute(viewer.role);
  const mine = viewer ? item.holds.find((hold) => hold.userId === viewer.id)?.qty ?? 0 : 0;
  const total = item.holds.reduce((sum, hold) => sum + hold.qty, 0);

  return (
    <PageWrapper leaf={item.name}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title={item.name}>
          <p className="text-sm text-gray-700">
            <Link href="/gear" className="underline">Gear</Link>
            {' · '}
            {item.category || 'No category'}
            {' · '}
            {total} total
          </p>
          {viewer && !canContribute(viewer.role) ? <p className="mt-3 text-sm font-bold">{APPROVAL_WAIT}</p> : null}
          {canEdit ? (
            <div className="mt-4">
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
          <h2 className="mt-6 text-xs font-bold uppercase tracking-wide">Who has it</h2>
          {item.holds.length === 0 ? (
            <p className="mt-1 text-sm text-gray-700">Nobody has marked this yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {item.holds.map((hold) => (
                <li key={hold.userId}>
                  {hold.handle ? <Link href={`/user/${hold.handle}`} className="underline">{hold.name}</Link> : hold.name}
                  <span className="text-gray-700"> × {hold.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
