import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { MountainPlace } from '@/lib/mountain-weather/places';

const OFFICE_NAME: Record<string, string> = {
  BTV: 'Burlington, VT',
  ALY: 'Albany, NY',
  GYX: 'Gray, ME',
  CAR: 'Caribou, ME',
  BOX: 'Boston, MA',
  OKX: 'New York, NY',
};

/** Plain facts about the place: where it is and which NWS office covers it. */
export function PlaceFactsSection({ place, stateName, sectionTitle }: { place: MountainPlace; stateName: string; sectionTitle: string }) {
  const rows: Array<[string, string]> = [
    ['Type', place.isBase ? 'Base' : 'Summit'],
    ['Section', `${sectionTitle}, ${stateName}`],
    ['Elevation', place.elevationFt != null ? `${place.elevationFt.toLocaleString('en-US')} ft` : '—'],
    ['NWS office that forecasts here', OFFICE_NAME[place.office] ? `${OFFICE_NAME[place.office]} (${place.office})` : place.office],
    ['Coordinates', `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`],
  ];
  return (
    <CollapsibleSection title="Place facts" subtitle="From Bannquet's list of places">
      <dl className="ui-list">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2 text-meta">
            <dt className="text-ink-2">{label}</dt>
            <dd className="text-right font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </CollapsibleSection>
  );
}
