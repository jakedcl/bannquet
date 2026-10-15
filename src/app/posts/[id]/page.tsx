import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/app/sign-in/actions';
import PageWrapper from '@/components/ui/PageWrapper';
import { Badge, Button, Table, Window } from '@/components/retro';
import { DeleteReport } from '@/components/posts/DeleteReport';
import { isDatabaseConfigured } from '@/db';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
import { listReportAttachments } from '@/lib/library';
import { canDeleteOwned } from '@/lib/membership';
import { POST_KIND_LABELS } from '@/lib/post-kinds';
import { loadReportTrail } from '@/lib/posts';
import { getTripReport } from '@/lib/trip-reports';
import { formatTripDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isDatabaseConfigured()) {
    return { title: 'Post | Bannquet' };
  }
  try {
    const report = await getTripReport(id);
    return { title: report ? `${report.title} | Bannquet` : 'Post | Bannquet' };
  } catch {
    return { title: 'Post | Bannquet' };
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Window title="Posts">
            <p className="mb-4 text-gray-700">Postgres is not connected, so this post cannot be loaded.</p>
            <Button tone="blue" href="/posts">Back to posts</Button>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  let report: Awaited<ReturnType<typeof getTripReport>> = null;
  let error: string | null = null;
  try {
    report = await getTripReport(id);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load post';
  }

  if (error) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Window title="Error">
            <p className="mb-4 text-red-800">{error}</p>
            <Button tone="blue" href="/posts">Back to posts</Button>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  if (!report) notFound();

  if (report.legacySanityId && report.legacySanityId === id && report.id !== id) {
    redirect(`/posts/${report.id}`);
  }

  const place = report.lat != null && report.lng != null
    ? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`
    : '—';
  const tripReport = report.postKind === 'trip_report';
  const trail = tripReport ? await loadReportTrail(report.id).catch(() => null) : null;
  const attached = tripReport
    ? await listReportAttachments(report.id).catch(() => ({ routes: [], pins: [], photos: [] }))
    : { routes: [], pins: [], photos: [] };
  const activity = report.activity && isActivity(report.activity) ? ACTIVITY_META[report.activity].label : null;
  const viewer = await getViewer();
  const canEdit = viewer?.id === report.authorId;
  const showOnMap = tripReport || report.lat != null;
  const manage = Boolean(viewer && canDeleteOwned({
    actorRole: viewer.role,
    actorId: viewer.id,
    ownerId: report.authorId,
  }));
  const attachmentRows = [
    ...attached.routes,
    ...attached.pins,
    ...attached.photos,
  ];

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6 flex flex-wrap gap-3">
          <Button tone="default" href="/posts">Back to posts</Button>
          {showOnMap ? <Button tone="blue" href={`/map?post=${report.id}`}>On the map</Button> : null}
          {canEdit ? <Button tone="yellow" href={`/posts/${report.id}/edit`}>Edit</Button> : null}
        </div>
        <Window title={report.title}>
          <div className="mb-4">
            <Badge>{POST_KIND_LABELS[report.postKind]}</Badge>
          </div>
          {tripReport ? (
            <Table
              headers={['Author', 'Date', 'Activity', 'Place']}
              rows={[[
                report.authorName,
                formatTripDate(report.tripDate, 'long'),
                activity ?? '—',
                place,
              ]]}
            />
          ) : (
            <p className="text-sm font-bold text-gray-800">{report.authorName}</p>
          )}
          {trail && (trail.distanceM != null || trail.taggedNames.length > 0) ? (
            <p className="mt-3 text-sm text-gray-700">
              {trail.distanceM != null ? `${formatMiles(trail.distanceM)} · ${formatFeetGain(trail.elevGainM ?? 0)}` : null}
              {trail.taggedNames.length > 0 ? ` · With ${trail.taggedNames.join(', ')}` : null}
            </p>
          ) : null}
          {report.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.tags.map((tag) => (
                <Badge key={tag}>{tag.replace(/-/g, ' ')}</Badge>
              ))}
            </div>
          )}
          <div className="mt-6 space-y-4 text-gray-800">
            {report.body
              ? report.body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="whitespace-pre-wrap leading-relaxed">{paragraph}</p>
              ))
              : <p className="text-gray-600">This post has no written notes.</p>}
          </div>
          <div className="mt-6">
            <p className="text-sm font-bold">Routes, pins, and photos</p>
            {attachmentRows.length === 0 ? (
              <p className="mt-1 text-sm text-gray-700">No routes, pins, or photos on this report.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {attachmentRows.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="underline">{item.title}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {report.photos.length > 0 && (
            <div className="mt-8 space-y-6">
              {report.photos.map((photo) => (
                <figure key={photo.id}>
                  <div className="relative aspect-video w-full bg-gray-100">
                    <Image
                      src={photo.url}
                      alt={photo.alt || photo.caption || report.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                  </div>
                  {photo.caption ? (
                    <figcaption className="mt-2 text-center text-sm italic text-gray-600">{photo.caption}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
          {manage ? (
            <div className="mt-8">
              <DeleteReport id={report.id} returnTo="/posts" />
            </div>
          ) : null}
        </Window>
      </div>
    </PageWrapper>
  );
}
