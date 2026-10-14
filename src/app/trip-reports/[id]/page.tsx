import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Badge, Button, Table, Window } from '@/components/retro';
import { isDatabaseConfigured } from '@/db';
import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { formatFeetGain, formatMiles } from '@/lib/gpx';
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
    return { title: 'Trip Report | Bannquet' };
  }
  try {
    const report = await getTripReport(id);
    return { title: report ? `${report.title} | Bannquet` : 'Trip Report | Bannquet' };
  } catch {
    return { title: 'Trip Report | Bannquet' };
  }
}

export default async function TripReportDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Window title="Trip reports">
            <p className="mb-4 text-gray-700">Postgres is not connected, so this report cannot be loaded.</p>
            <Button tone="blue" href="/trip-reports">Back to trip reports</Button>
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
    error = err instanceof Error ? err.message : 'Failed to load trip report';
  }

  if (error) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Window title="Error">
            <p className="mb-4 text-red-800">{error}</p>
            <Button tone="blue" href="/trip-reports">Back to trip reports</Button>
          </Window>
        </div>
      </PageWrapper>
    );
  }

  if (!report) notFound();

  if (report.legacySanityId && report.legacySanityId === id && report.id !== id) {
    redirect(`/trip-reports/${report.id}`);
  }

  const place = report.lat != null && report.lng != null
    ? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`
    : '—';
  const trail = await loadReportTrail(report.id).catch(() => null);
  const activity = report.activity && isActivity(report.activity) ? ACTIVITY_META[report.activity].label : null;

  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6 flex gap-3">
          <Button tone="default" href="/trip-reports">Back to trip reports</Button>
          <Button tone="blue" href={`/map?post=${report.id}`}>On the map</Button>
        </div>
        <Window title={report.title}>
          <Table
            headers={['Author', 'Date', 'Activity', 'Place']}
            rows={[[
              report.authorName,
              formatTripDate(report.tripDate, 'long'),
              activity ?? '—',
              place,
            ]]}
          />
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
              : <p className="text-gray-600">This report has no written notes.</p>}
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
        </Window>
      </div>
    </PageWrapper>
  );
}
