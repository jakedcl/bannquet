import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { getMountainState, isMountainStateCode } from '@/lib/mountain-weather/places';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return [{ state: 'ny' }, { state: 'vt' }, { state: 'nh' }, { state: 'me' }];
}

export default async function MountainStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!isMountainStateCode(state)) notFound();
  const entry = getMountainState(state);
  if (!entry) notFound();

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <p className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
        </p>
        <LargeTitle title={entry.name} />
        <Card title="Sections" padded={false}>
          <ListGroup bare>
            {entry.sections.map((section) => (
              <ListRow
                key={section.id}
                href={`/mountain-weather/${state}/${section.id}`}
                title={section.title}
                subtitle={`${section.places.length} places`}
              />
            ))}
          </ListGroup>
        </Card>
      </div>
    </PageWrapper>
  );
}
