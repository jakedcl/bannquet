'use client';

import PageWrapper from '@/components/ui/PageWrapper';
import WeatherDashboard from '@/components/WeatherDashboard';
import { useRegion } from '@/contexts/RegionContext';
import { DEFAULT_REGION, REGION_LABELS, REGION_WEATHER_SECTIONS, WeatherSection } from '@/lib/regions';

export default function WeatherPage() {
  const { region } = useRegion();
  const sections = REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
  const regionLabel = REGION_LABELS[region];
  const showMwobs = region === 'nh';
  
  return (
    <PageWrapper className="bg-gray-50">
      <div className="container mx-auto px-4 py-12 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-green/70">weather</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Mountain Conditions — {regionLabel}
      </h1>
        </header>

        {showMwobs && (
          <div className="rounded-2xl border border-brand-green/30 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold text-brand-green">Mount Washington Observatory</p>
            <p className="text-xs text-gray-500">Tap a section banner for live summit data</p>
          </div>
        )}

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
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green border border-brand-green/40 rounded-full px-4 py-2 hover:bg-brand-green/5 transition-colors"
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