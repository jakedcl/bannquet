import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { getMountainSection, getMountainState, isMountainStateCode } from '@/lib/mountain-weather/places';

export const dynamic = 'force-dynamic';

export default async function MountainSectionPage({
  params,
}: {
  params: Promise<{ state: string; section: string }>;
}) {
  const { state, section: sectionId } = await params;
  if (!isMountainStateCode(state)) notFound();
  const stateEntry = getMountainState(state);
  const section = getMountainSection(state, sectionId);
  if (!stateEntry || !section) notFound();

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <p className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
          {' · '}
          <Link href={`/mountain-weather/${state}`} className="font-bold underline">{stateEntry.name}</Link>
        </p>
        <LargeTitle title={section.title} />
        <Card padded={false}>
          <ListGroup bare>
            {section.places.map((place) => (
              <ListRow
                key={place.id}
                href={`/mountain-weather/${state}/${sectionId}/${place.id}`}
                title={place.name}
                subtitle={[
                  place.elevationFt ? `${place.elevationFt.toLocaleString('en-US')} ft` : null,
                  place.isBase ? 'Base' : null,
                  `NWS ${place.office}`,
                ].filter(Boolean).join(' · ')}
              />
            ))}
          </ListGroup>
        </Card>
      </div>
    </PageWrapper>
  );
}
