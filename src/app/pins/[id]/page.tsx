import { SmallPhotoImage } from '@/components/ui/SmallPhotoImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { DeletePinButton, PinForm } from '@/components/pins/PinForm';
import { AddToTrip } from '@/components/library/AddToTrip';
import { Pill } from '@/components/hub/Button';
import { Button } from '@/components/hub/Button';
import { Card } from '@/components/hub/Card';
import { getViewer } from '@/app/sign-in/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { isDatabaseConfigured } from '@/db';
import { canEditOwned } from '@/lib/membership';
import { loadPin } from '@/lib/pins';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { loadMapDataNear } from '@/lib/posts';
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
  const manage = Boolean(viewer && canEditOwned({
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
  const data = await loadMapDataNear(viewer?.id ?? null, { lng: pin.lng, lat: pin.lat });
  const activity = pin.activity && isActivity(pin.activity) ? ACTIVITY_META[pin.activity].label : null;
  const category = isPinKind(pin.kind) ? PIN_KIND_LABELS[pin.kind] : 'Other';

  return (
    <PageWrapper leaf={pin.title}>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Card title={pin.title}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {activity ? <Pill>{activity}</Pill> : null}
            <Pill>{category}</Pill>
          </div>
          <p className="text-sm text-gray-700">
            {formatTripDate(pin.visitedOn)}
            {' · '}
            {pin.handle ? <Link href={`/user/${pin.handle}`} className="underline">{pin.who}</Link> : pin.who}
          </p>
          {pin.note ? <p className="mt-4 whitespace-pre-wrap text-sm">{pin.note}</p> : null}
          {pin.photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {pin.photos.map((photo) => (
                <Link key={photo.id} href={`/photos/${photo.id}`}>
                  <SmallPhotoImage
                    url={photo.url}
                    thumbUrl={photo.thumbUrl}
                    alt={photo.alt || ''}
                    width={240}
                    height={240}
                    className="h-28 w-full object-cover retro-box"
                  />
                </Link>
              ))}
            </div>
          ) : null}
          <div className="mt-4">
            <Button href={`/map?pin=${pin.id}`} tone="blue">Open on the map</Button>
          </div>
        </Card>
        <div className="retro-box h-80 min-h-[420px] overflow-hidden bg-white">
          <MapCanvas
            points={data.points}
            lines={data.lines}
            focus={{ lng: pin.lng, lat: pin.lat, zoom: 12 }}
          />
        </div>
        {manage && viewer ? (
          <Card title="Edit this pin">
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
            <div className="mt-4">
              <DeletePinButton id={pin.id} />
            </div>
          </Card>
        ) : null}
        {manage ? (
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
