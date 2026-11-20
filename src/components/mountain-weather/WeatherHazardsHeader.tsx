import { tagClass, type TagKind } from '@/components/hub/Button';
import type { WeatherHazard } from '@/types/weather';

/** Warning and Watch get the brown arrow tag; Advisory and Statement the outline tag. */
function level(event: string): { label: string; tag: TagKind; edge: string } {
  if (/warning/i.test(event)) return { label: 'Warning', tag: 'arrow', edge: 'border-l-danger-bright' };
  if (/watch/i.test(event)) return { label: 'Watch', tag: 'arrow', edge: 'border-l-warn' };
  if (/advisory/i.test(event)) return { label: 'Advisory', tag: 'outline', edge: 'border-l-warn' };
  return { label: 'Statement', tag: 'outline', edge: 'border-l-brand-light' };
}

/** Active NWS alerts for a place, as alert cards (Wx-Kit board). */
export function WeatherHazardsHeader({ hazards }: { hazards: WeatherHazard[] }) {
  if (!hazards.length) return null;
  return (
    <section className="space-y-3" aria-label="Active weather alerts">
      {hazards.map((hazard) => {
        const { label, tag, edge } = level(hazard.event);
        return (
          <article key={hazard.id} className={`panel border-l-6 bg-surface-gray px-4 py-3 ${edge}`}>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={tagClass(tag)}>{label}</span>
              <span className="text-caption text-ink-2">
                National Weather Service{hazard.severity ? ` · ${hazard.severity}` : ''}
              </span>
            </p>
            <h2 className="mt-1.5 font-heading text-body font-bold uppercase [overflow-wrap:anywhere]">{hazard.event}</h2>
            {hazard.headline ? <p className="mt-1 text-meta [overflow-wrap:anywhere]">{hazard.headline}</p> : null}
            {hazard.areaDesc ? <p className="mt-1 text-caption text-ink-2">{hazard.areaDesc}</p> : null}
            {hazard.instruction || hazard.description ? (
              <div className="mt-2 space-y-2">
                {hazard.instruction ? <AlertMore label="Instructions" text={hazard.instruction} /> : null}
                {hazard.description ? <AlertMore label="Details" text={hazard.description} /> : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function AlertMore({ label, text }: { label: string; text: string }) {
  return (
    <details className="group">
      <summary className="btn btn-sm list-none [&::-webkit-details-marker]:hidden">{label}</summary>
      <p className="mt-2 whitespace-pre-wrap text-meta [overflow-wrap:anywhere]">{text}</p>
    </details>
  );
}
