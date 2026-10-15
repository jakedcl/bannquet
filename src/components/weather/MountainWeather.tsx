'use client';

import WeatherDashboard from '@/components/WeatherDashboard';
import { useRegion } from '@/contexts/RegionContext';
import { DEFAULT_REGION, REGION_LABELS, REGION_OPTIONS, REGION_WEATHER_SECTIONS, type WeatherSection } from '@/lib/regions';

export function MountainWeather({ children }: { children: React.ReactNode }) {
  const { region, setRegion } = useRegion();
  const sections = REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
  const regionLabel = REGION_LABELS[region] ?? region.toUpperCase();

  return (
    <div className="container mx-auto space-y-8 px-4 py-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 md:text-5xl">Regional mountain weather</h1>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a state">
          {REGION_OPTIONS.map((option) => {
            const selected = option.code === region;
            const tone = option.buttonTone === 'default' ? 'retro-button' : `retro-button-${option.buttonTone}`;
            return (
              <button
                key={option.code}
                type="button"
                aria-pressed={selected}
                onClick={() => setRegion(option.code)}
                className={`region-pick rounded-none px-4 py-2 text-sm font-bold uppercase tracking-wide ${selected ? 'retro-button-yellow' : tone}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      {children}

      <section className="space-y-8" aria-label={`${regionLabel} forecast`}>
        <h2 className="text-2xl font-bold text-gray-900">{regionLabel} forecast</h2>
        {sections.length === 0 ? (
          <p className="text-sm">No forecast spots for this state.</p>
        ) : sections.map((section) => (
          <RegionSection key={section.id} section={section} />
        ))}
      </section>
    </div>
  );
}

function RegionSection({ section }: { section: WeatherSection }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
        {section.banner ? (
          <a
            href={section.banner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green"
          >
            {section.banner.label}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {section.spots.map((spot) => (
          <WeatherDashboard key={spot.id} spot={spot} />
        ))}
      </div>
    </section>
  );
}
