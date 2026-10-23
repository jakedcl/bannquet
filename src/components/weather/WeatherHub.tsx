import Image from 'next/image';
import Link from 'next/link';
import { DashboardGrid } from '@/components/ui/DashboardGrid';
import { DashboardWindow } from '@/components/ui/DashboardWindow';
import type { RegionGlance, StateGlance } from '@/lib/weather-hub';

function degrees(high: number | null, low: number | null): string {
  if (high == null && low == null) return '—';
  const hi = high == null ? '—' : `${Math.round(high)}°`;
  const lo = low == null ? '—' : `${Math.round(low)}°`;
  return `${hi}/${lo}`;
}

function RegionRow({ region }: { region: RegionGlance }) {
  return (
    <li>
      <Link href={region.href} className="block min-w-0 py-1 text-xs no-underline">
        <span className="flex min-w-0 items-center gap-2">
          {region.icon ? (
            <Image src={region.icon} alt="" width={20} height={20} unoptimized className="h-5 w-5 shrink-0 object-contain" />
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 truncate font-bold text-black">{region.title}</span>
          <span className="shrink-0 tabular-nums">{degrees(region.high, region.low)}</span>
          <span className="shrink-0 tabular-nums">{region.precip == null ? '—' : `${Math.round(region.precip)}%`}</span>
          <span className="shrink-0">{region.wind ?? '—'}</span>
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 pl-7">
          <span className="min-w-0 flex-1 truncate">{region.phrase}</span>
          {region.alert ? (
            <span className="max-w-[9rem] shrink-0 truncate bg-[#5c3a1e] px-1 py-0.5 text-[10px] font-bold uppercase text-white">
              {region.alert}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

export function WeatherHub({ states }: { states: StateGlance[] }) {
  return (
    <DashboardGrid>
      {states.map((state) => (
        <DashboardWindow key={state.code} title={state.name} href={state.href}>
          {state.regions.length === 0 ? (
            <p className="text-sm">No regions.</p>
          ) : (
            <ul>
              {state.regions.map((region) => (
                <RegionRow key={region.id} region={region} />
              ))}
            </ul>
          )}
        </DashboardWindow>
      ))}
    </DashboardGrid>
  );
}
