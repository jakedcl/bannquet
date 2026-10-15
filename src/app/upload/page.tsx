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
        {kind ? null : (
          <Window title="Upload">
            <SectionList links={UPLOAD_LINKS} label="Upload" />
          </Window>
        )}
        {kind === 'route' ? (
          <Window title="Route (GPX)">
            <RouteUpload />
          </Window>
        ) : null}
        {kind === 'pin' ? (
          <Window title="Pin">
            <PinForm />
          </Window>
        ) : null}
        {kind === 'photo' ? (
          <Window title="Photo">
            <PhotoUpload />
          </Window>
        ) : null}
      </div>
    </PageWrapper>
  );
}
