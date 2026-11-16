import type { PlaceAvalancheData } from '@/lib/mountain-weather/read-place-avalanche';

export function AvalancheStatus({ data }: { data: PlaceAvalancheData | null }) {
  if (!data) return null;
  const centers = data.centers.filter((center) => center.data);
  if (!centers.length) return null;
  return (
    <aside className="border border-amber-700/40 bg-amber-50/90 p-3 text-sm" aria-label="Avalanche guidance status">
      <p className="font-bold uppercase">Avalanche center guidance</p>
      {centers.map((center) => {
        const product = center.data!;
        const active = center.status === 'ok' && !product.offSeason;
        return (
          <p key={product.centerId}>
            {product.centerId} · {active ? (product.dangerLabel || 'Active forecast') : 'No current forecast'}
            {active && product.expiresTime ? ` · expires ${new Date(product.expiresTime).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', timeZoneName: 'short' })}` : ''}
            {' · '}<a href="#avalanche-guidance" className="font-bold underline">Full guidance below</a>
          </p>
        );
      })}
      <p className="text-xs text-gray-700">No issued forecast does not mean low danger.</p>
    </aside>
  );
}
