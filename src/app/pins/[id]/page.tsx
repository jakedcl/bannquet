import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { DeletePinButton, PinForm } from '@/components/pins/PinForm';
import { SeeMore } from '@/components/library/AttachReport';
import { AddToTrip } from '@/components/library/AddToTrip';
import { Badge } from '@/components/retro/Badge';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { isDatabaseConfigured } from '@/db';
import { canContribute, canDeleteOwned } from '@/lib/membership';
import { loadPin } from '@/lib/pins';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { loadMapData } from '@/lib/posts';
import { listTripChoices, tripsForItem } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PIN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addTrip?: string }>;
}) {
  const { id } = await params;
  const { addTrip } = await searchParams;
  if (!PIN_ID.test(id) || !isDatabaseConfigured()) notFound();
  const pin = await loadPin(id);
  if (!pin) notFound();

  const viewer = await getViewer();
  const manage = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: pin.createdBy,
  }));
  const [tripChoices, attachedTrips] = viewer && manage
    ? await Promise.all([
      listTripChoices().catch(() => []),
      tripsForItem('pin', pin.id).catch(() => []),
    ])
    : [[], []];
  const data = await loadMapData();
  const activity = pin.activity && isActivity(pin.activity) ? ACTIVITY_META[pin.activity].label : null;
  const category = isPinKind(pin.kind) ? PIN_KIND_LABELS[pin.kind] : 'Other';

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Window title={pin.title}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {activity ? <Badge>{activity}</Badge> : null}
            <Badge>{category}</Badge>
          </div>
          <p className="text-sm text-gray-700">
            {formatTripDate(pin.visitedOn)}
            {' · '}
            {pin.handle ? <Link href={`/user/${pin.handle}`} className="underline">{pin.who}</Link> : pin.who}
          </p>
          <div className="mt-3">
            <SeeMore post={pin.post} />
          </div>
          {pin.note ? <p className="mt-4 whitespace-pre-wrap text-sm">{pin.note}</p> : null}
          {pin.photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {pin.photos.map((photo) => (
                <Link key={photo.id} href={`/photos/${photo.id}`}>
                  <Image src={photo.url} alt={photo.alt || ''} width={240} height={240} className="h-28 w-full object-cover retro-box" />
                </Link>
              ))}
            </div>
          ) : null}
          <div className="mt-4">
            <Button href={`/map?pin=${pin.id}`} tone="blue">Open on the map</Button>
          </div>
        </Window>
        <div className="retro-box h-80 min-h-[420px] overflow-hidden bg-white">
          <MapCanvas
            points={data.points}
            lines={data.lines}
            focus={{ lng: pin.lng, lat: pin.lat, zoom: 12 }}
          />
        </div>
        {manage && viewer ? (
          <Window title="Edit this pin">
            {viewer.id === pin.createdBy ? (
            <PinForm
              initial={{
                id: pin.id,
                title: pin.title,
                note: pin.note ?? '',
                kind: pin.kind,
                lat: pin.lat,
                lng: pin.lng,
                photos: pin.photos,
              }}
            />
            ) : null}
            <div className="mt-4">
              <DeletePinButton id={pin.id} />
            </div>
          </Window>
        ) : null}
        {viewer && canContribute(viewer.role) && viewer.id === pin.createdBy ? (
          <AddToTrip
            kind="pin"
            entityId={pin.id}
            trips={tripChoices}
            attached={attachedTrips}
            startOpen={addTrip === '1'}
          />
        ) : null}
      </div>
    </PageWrapper>
  );
}
