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
    <PageWrapper>
      <div className="page-shell page-pad space-y-10">
        <header className="space-y-3">
          <p className="page-kicker">National Weather Service</p>
          <h1 className="page-title">
            Mountain Conditions — {regionLabel}
          </h1>
        </header>

        <div className="space-y-12">
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
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
        {section.banner && (
          <a
            href={section.banner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="retro-button-green text-sm"
          >
            {section.banner.label}
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {section.spots.map((spot) => (
          <WeatherDashboard key={spot.id} spot={spot} />
        ))}
      </div>
    </section>
  );
} 