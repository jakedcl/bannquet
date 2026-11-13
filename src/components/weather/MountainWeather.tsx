import WeatherDashboard from '@/components/weather/WeatherDashboard';
import { LargeTitle, SectionHeader } from '@/components/hub/SectionHeader';
import { HashScroll } from '@/components/weather/HashScroll';
import { DEFAULT_REGION, REGION_LABELS, REGION_WEATHER_SECTIONS, isRegionCode, type WeatherSection } from '@/lib/regions';

const STATE_NAMES: Record<string, string> = {
  ny: 'New York',
  vt: 'Vermont',
  nh: 'New Hampshire',
  me: 'Maine',
};

export function MountainWeather({ state }: { state?: string }) {
  const region = isRegionCode(state) ? state : DEFAULT_REGION;
  const sections = REGION_WEATHER_SECTIONS[region] ?? REGION_WEATHER_SECTIONS[DEFAULT_REGION];
  const regionLabel = REGION_LABELS[region] ?? region.toUpperCase();
  const stateName = STATE_NAMES[region] ?? regionLabel;

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8 px-4 pb-12 pt-6 md:pt-8">
      <HashScroll />
      <LargeTitle eyebrow="Mountain Weather" title={stateName} />

      <section className="space-y-10" aria-label={`${regionLabel} forecast`}>
        {sections.length === 0 ? (
          <p className="t-subhead px-1 text-ui-label-2">No forecast spots for this state.</p>
        ) : sections.map((section) => (
          <RegionSection key={section.id} section={section} />
        ))}
      </section>
    </div>
  );
}

function RegionSection({ section }: { section: WeatherSection }) {
  return (
    <section id={section.id} className="scroll-mt-36 space-y-3">
      <SectionHeader
        title={section.title}
        subtitle={section.banner ? (
          <a
            href={section.banner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words font-bold text-brand-green underline"
          >
            {section.banner.label}
          </a>
        ) : null}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {section.spots.map((spot) => (
          <WeatherDashboard key={spot.id} spot={spot} />
        ))}
      </div>
    </section>
  );
}
