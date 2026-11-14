import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PinForm } from '@/components/pins/PinForm';
import { PhotoUpload, RouteUpload } from '@/components/posts/ProfileAdds';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { NewPostForm } from '@/components/feed/NewPostForm';
import { getViewer } from '@/app/sign-in/actions';
import { listChatCatalog } from '@/lib/chat';
import { isDatabaseConfigured } from '@/db';
import { APPROVAL_WAIT, canContribute } from '@/lib/membership';
import { UPLOAD_LINKS } from '@/lib/sections';
import { presetFromCatalog } from '@/lib/trip-draft';
import { signInPath } from '@/lib/sign-in-next';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

const KINDS = [
  { id: 'post', label: 'New post' },
  { id: 'route', label: 'Route (GPX)' },
  { id: 'pin', label: 'Pin' },
  { id: 'photo', label: 'Photo' },
] as const;

type UploadKind = (typeof KINDS)[number]['id'];

const KIND_TITLE = Object.fromEntries(KINDS.map((item) => [item.id, item.label])) as Record<UploadKind, string>;

function isKind(value: string | undefined): value is UploadKind {
  return KINDS.some((item) => item.id === value);
}

function uploadPath(kind: UploadKind | null): string {
  if (!kind) return '/upload';
  return `/upload?kind=${kind}`;
}

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; pin?: string | string[]; route?: string | string[]; photo?: string | string[] }>;
}) {
  const params = await searchParams;
  const kind = isKind(params.kind) ? params.kind : null;
  const catalog = kind === 'post' && isDatabaseConfigured()
    ? await listChatCatalog().catch(() => [])
    : [];
  const preset = presetFromCatalog(catalog, {
    pin: params.pin,
    route: params.route,
    photo: params.photo,
  });
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath(uploadPath(kind)));

  if (!canContribute(viewer.role)) {
    return (
      <PageWrapper>
        <HubPage title="Upload" width="2xl">
          <Card>
            <p className="text-sm font-bold">{APPROVAL_WAIT}</p>
          </Card>
        </HubPage>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <HubPage title={kind ? KIND_TITLE[kind] : 'Upload'} eyebrow={kind ? 'Upload' : undefined} width="2xl">
        {kind ? null : (
          <Card padded={false}>
            <ListGroup bare>
              {UPLOAD_LINKS.map((item) => (
                <ListRow key={item.href} href={item.href} title={item.label} />
              ))}
            </ListGroup>
          </Card>
        )}
        {kind === 'post' ? (
          <Card>
            <NewPostForm viewerId={viewer.id} catalog={catalog} preset={preset} />
          </Card>
        ) : null}
        {kind === 'route' ? (
          <Card>
            <RouteUpload />
          </Card>
        ) : null}
        {kind === 'pin' ? (
          <Card>
            <PinForm />
          </Card>
        ) : null}
        {kind === 'photo' ? (
          <Card>
            <PhotoUpload />
          </Card>
        ) : null}
      </HubPage>
    </PageWrapper>
  );
}
