import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { MapCanvas } from '@/components/map/MapCanvas';
import { DeletePinButton, PinForm } from '@/components/pins/PinForm';
import { Badge } from '@/components/retro/Badge';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { getViewer } from '@/app/sign-in/actions';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { isDatabaseConfigured } from '@/db';
import { canContribute } from '@/lib/membership';
import { loadPin } from '@/lib/pins';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { loadMapData } from '@/lib/posts';
import { formatTripDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PIN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PIN_ID.test(id) || !isDatabaseConfigured()) notFound();
  const pin = await loadPin(id);
  if (!pin) notFound();

  const viewer = await getViewer();
  const owner = Boolean(viewer && viewer.id === pin.createdBy && canContribute(viewer.role));
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
          {pin.note ? <p className="mt-4 whitespace-pre-wrap text-sm">{pin.note}</p> : null}
          {pin.photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {pin.photos.map((photo) => (
                <Image key={photo.id} src={photo.url} alt={photo.alt || ''} width={240} height={240} className="h-28 w-full object-cover retro-box" />
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
        {owner ? (
          <Window title="Edit this pin">
            <PinForm
              initial={{
                id: pin.id,
                title: pin.title,
                note: pin.note ?? '',
                activity: pin.activity ?? 'hike',
                kind: pin.kind,
                visitedOn: pin.visitedOn ?? new Date().toISOString().slice(0, 10),
                lat: pin.lat,
                lng: pin.lng,
                photos: pin.photos,
              }}
            />
            <div className="mt-4">
              <DeletePinButton id={pin.id} />
            </div>
          </Window>
        ) : null}
      </div>
    </PageWrapper>
  );
}
