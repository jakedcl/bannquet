import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { addGearAction, setHoldAction } from '@/app/gear/actions';
import { getViewer } from '@/app/sign-in/actions';
import { listGear } from '@/lib/gear';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { isDatabaseConfigured } from '@/db';
import { GearAddForm } from '@/components/gear/GearAddForm';

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
  const canEdit = Boolean(viewer && canContribute(viewer.role) && !error);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title="Gear">
          <p className="mb-4 text-sm text-gray-700">
            Shared stuff for the group. Add an item, then mark how many you have so someone knows who to borrow from.
          </p>
          {error ? <p className="mb-3 text-sm font-bold">{error}</p> : null}
          {!viewer ? <p className="mb-3 text-sm font-bold">Sign in to add gear or mark what you have.</p> : null}
          {viewer && !canContribute(viewer.role) ? <p className="mb-3 text-sm font-bold">{APPROVAL_WAIT}</p> : null}
          {canEdit ? <GearAddForm action={addGearAction} /> : null}
          {items.length === 0 ? (
            <p className="mt-4 text-sm">Nothing on the list yet. Microspikes, poles, insulated boots.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {items.map((item) => {
                const mine = viewer ? item.holds.find((hold) => hold.userId === viewer.id) : null;
                return (
                  <li key={item.id} className="border-t border-gray-300 pt-3">
                    <p className="font-bold">{item.name}</p>
                    {item.holds.length === 0 ? (
                      <p className="mt-1 text-sm text-gray-700">Nobody has marked this yet.</p>
                    ) : (
                      <ul className="mt-1 text-sm">
                        {item.holds.map((hold) => (
                          <li key={hold.userId}>
                            {hold.handle ? <Link href={`/user/${hold.handle}`} className="underline">{hold.name}</Link> : hold.name}
                            {` ×${hold.qty}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {canEdit ? (
                      <form action={setHoldAction} className="mt-2 flex items-center gap-2">
                        <input type="hidden" name="gearId" value={item.id} />
                        <label className="text-sm">
                          <span className="sr-only">How many you have</span>
                          <input
                            name="qty"
                            type="number"
                            min={0}
                            max={99}
                            defaultValue={mine?.qty ?? 0}
                            className="w-16 retro-box-inset bg-white px-2 py-1"
                          />
                        </label>
                        <button type="submit" className="retro-button-yellow rounded-none px-3 py-1 text-xs font-bold uppercase">
                          I have this
                        </button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}
