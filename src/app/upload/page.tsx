import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PinForm } from '@/components/pins/PinForm';
import { PhotoUpload, RouteUpload } from '@/components/posts/ProfileAdds';
import { Window } from '@/components/retro/Window';
import { SectionList } from '@/components/ui/SectionList';
import { UPLOAD_LINKS } from '@/lib/sections';
import { getViewer } from '@/app/sign-in/actions';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { signInPath } from '@/lib/sign-in-next';

export const dynamic = 'force-dynamic';

const KINDS = [
  { id: 'post', label: 'Trip' },
  { id: 'route', label: 'Route (GPX)' },
  { id: 'pin', label: 'Pin' },
  { id: 'photo', label: 'Photo' },
] as const;

type UploadKind = (typeof KINDS)[number]['id'];

function isKind(value: string | undefined): value is UploadKind {
  return KINDS.some((item) => item.id === value);
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const kind = isKind(params.kind) ? params.kind : null;
  if (kind === 'post') redirect('/trips/new');
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath(kind ? `/upload?kind=${kind}` : '/upload'));

  if (!canContribute(viewer.role)) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Window title="Upload">
            <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Window title="Upload">
          <p className="mb-4 text-sm text-gray-700">
            Add a route, a pin, or a photo. They show on the map and on your page. A trip is its own page.
          </p>
          {kind ? null : <SectionList links={UPLOAD_LINKS} label="Upload" />}
        </Window>
        {kind === 'route' ? (
          <Window title="Route (GPX)">
            <p className="mb-4 text-sm text-gray-700">
              A route added here shows on the map and on your page.
            </p>
            <RouteUpload />
          </Window>
        ) : null}
        {kind === 'pin' ? (
          <Window title="Pin">
            <p className="mb-4 text-sm text-gray-700">
              Drop a spot on the map. Give it a title, what you were doing, and a note. Photos are optional.
            </p>
            <PinForm />
          </Window>
        ) : null}
        {kind === 'photo' ? (
          <Window title="Photo">
            <p className="mb-4 text-sm text-gray-700">
              Photos land on the map at the spot they were taken, or where you drop them.
            </p>
            <PhotoUpload />
          </Window>
        ) : null}
      </div>
    </PageWrapper>
  );
}
