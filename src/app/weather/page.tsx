'use client';

import PageWrapper from '@/components/ui/PageWrapper';
import WeatherDashboard from '@/components/WeatherDashboard';
import { useRegion } from '@/contexts/RegionContext';
import { DEFAULT_REGION, REGION_LABELS, REGION_WEATHER_SECTIONS, WeatherSection } from '@/lib/regions';

export default function WeatherPage() {
  const { region } = useRegion();
  const sections = REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
  const regionLabel = REGION_LABELS[region];

  return (
    <PageWrapper className="bg-gray-50">
      <div className="container mx-auto space-y-8 px-4 py-10">
        <h1 className="text-sm font-bold uppercase">
          Mountain Conditions — {regionLabel}
        </h1>
        <div className="space-y-8">
          {sections.map((section) => (
            <RegionSection key={section.id} section={section} />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

function RegionSection({ section }: { section: WeatherSection }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-bold uppercase">{section.title}</h2>
        {section.banner ? (
          <a
            href={section.banner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold underline"
          >
            {section.banner.label}
          </a>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {section.spots.map((spot) => (
          <WeatherDashboard key={spot.id} spot={spot} />
        ))}
      </div>
    </section>
  );
}
