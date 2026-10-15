'use client';

import { useEffect } from 'react';
import WeatherDashboard from '@/components/WeatherDashboard';
import WeatherTicker from '@/components/ui/WeatherTicker';
import { useRegion } from '@/contexts/RegionContext';
import { DEFAULT_REGION, REGION_LABELS, REGION_WEATHER_SECTIONS, isRegionCode, type WeatherSection } from '@/lib/regions';

const STATE_NAMES: Record<string, string> = {
  ny: 'New York',
  vt: 'Vermont',
  nh: 'New Hampshire',
  me: 'Maine',
};

export function MountainWeather({ state }: { state?: string }) {
  const { setRegion } = useRegion();
  const region = isRegionCode(state) ? state : DEFAULT_REGION;
  const sections = REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
  const regionLabel = REGION_LABELS[region] ?? region.toUpperCase();
  const stateName = STATE_NAMES[region] ?? regionLabel;

  useEffect(() => {
    setRegion(region);
  }, [region, setRegion]);

  return (
    <div className="container mx-auto space-y-8 px-4 py-10">
      <header className="space-y-4">
        <WeatherTicker placement="page" />
        <h1 className="inline-block max-w-full retro-box-inset bg-white px-3 py-2 text-2xl font-bold leading-tight text-gray-900">
          {stateName} Mountain Weather
        </h1>
      </header>

      <section className="space-y-8" aria-label={`${regionLabel} forecast`}>
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
