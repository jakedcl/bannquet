import type { WeatherHazard } from '@/types/weather';

export function WeatherHazardsHeader({ hazards }: { hazards: WeatherHazard[] }) {
  if (!hazards.length) return null;
  return (
    <div className="space-y-2 border border-amber-700/40 bg-amber-50/90 p-3 text-sm" role="region" aria-label="Active weather alerts">
      <p className="text-xs font-bold uppercase text-amber-900">Active NWS alerts</p>
      <ul className="space-y-2">
        {hazards.map((hazard) => (
          <li key={hazard.id}>
            <p className="font-bold">{hazard.event}{hazard.severity ? ` · ${hazard.severity}` : ''}</p>
            {hazard.headline ? <p className="text-gray-900">{hazard.headline}</p> : null}
            {hazard.instruction ? (
              <details className="mt-1 text-xs text-gray-800">
                <summary className="cursor-pointer font-bold">Instructions</summary>
                <p className="mt-1 whitespace-pre-wrap">{hazard.instruction}</p>
              </details>
            ) : null}
            {hazard.description ? (
              <details className="mt-1 text-xs text-gray-800">
                <summary className="cursor-pointer font-bold">Details</summary>
                <p className="mt-1 whitespace-pre-wrap">{hazard.description}</p>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
