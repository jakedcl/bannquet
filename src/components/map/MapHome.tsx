'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sheet } from '@/components/hub/Sheet';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { CloseIcon } from '@/components/hub/Icons';
import { clusterHeading } from '@/lib/map';
import { leafFromProps, leafMeta, type MapLeaf } from '@/lib/map-leaf';
import type { MapFeatureCollection } from '@/lib/posts';

const GroupMap = dynamic(() => import('@/components/map/GroupMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ui-fill" />,
});

function KindDot({ leaf }: { leaf: MapLeaf }) {
  const shape = leaf.kind === 'pin' ? 'rounded-[4px] rotate-45 scale-75' : leaf.kind === 'route' ? 'rounded-full ring-2 ring-inset ring-white/70' : 'rounded-full';
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ui-fill">
      <span className={`block h-3.5 w-3.5 ${shape}`} style={{ background: leaf.color }} />
    </span>
  );
}

function LeafRows({ leaves }: { leaves: MapLeaf[] }) {
  return (
    <ListGroup inset="3.75rem">
      {leaves.map((leaf) => (
        <ListRow
          key={`${leaf.kind}-${leaf.href}`}
          href={leaf.href}
          leading={<KindDot leaf={leaf} />}
          title={leaf.title}
          subtitle={leafMeta(leaf)}
        />
      ))}
    </ListGroup>
  );
}

function plural(count: number, one: string): string {
  return `${count} ${count === 1 ? one : `${one}s`}`;
}

/** The home screen: the whole crew's map with an Apple Maps style card. */
export function MapHome({
  points,
  lines,
  focus,
}: {
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
  focus: { lng: number; lat: number; zoom?: number };
}) {
  const [selected, setSelected] = useState<MapLeaf[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  const all = useMemo(() => {
    const seen = new Set<string>();
    const leaves: MapLeaf[] = [];
    for (const feature of points.features) {
      if (feature.geometry.type !== 'Point') continue;
      const [lng, lat] = feature.geometry.coordinates;
      const leaf = leafFromProps((feature.properties ?? {}) as Record<string, unknown>, lng, lat);
      if (seen.has(leaf.href)) continue;
      seen.add(leaf.href);
      leaves.push(leaf);
    }
    return leaves;
  }, [points]);

  const recent = useMemo(
    () => [...all].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 12),
    [all],
  );

  const summary = useMemo(() => {
    const count = (kind: string) => all.filter((leaf) => leaf.kind === kind).length;
    return [plural(count('route'), 'route'), plural(count('pin'), 'pin'), plural(count('photo'), 'photo')].join(' · ');
  }, [all]);

  const onSelect = useCallback((leaves: MapLeaf[] | null) => {
    setSelected(leaves);
    setExpanded(Boolean(leaves));
  }, []);

  const single = selected?.length === 1 ? selected[0] : null;
  const header = selected ? (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="t-title3 truncate">{single ? single.title : clusterHeading(selected.map((leaf) => leaf.kind))}</h2>
        <p className="t-footnote mt-0.5 truncate text-ui-label-2">{single ? leafMeta(single) : 'Here'}</p>
      </div>
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-label="Close"
        className="ui-press mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-fill text-ui-label-2"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : (
    <div className="min-w-0">
      <h1 className="t-title2">Map</h1>
      <p className="t-footnote mt-0.5 text-ui-label-2">{summary}</p>
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GroupMap
        points={points}
        lines={lines}
        focus={focus}
        onSelect={onSelect}
        creditClassName="left-2 top-2 md:left-auto md:top-auto md:bottom-2 md:right-2"
      />
      <Sheet expanded={expanded} onExpandedChange={setExpanded} header={header} label={selected ? 'Selected' : 'Map'}>
        {selected ? (
          <LeafRows leaves={selected} />
        ) : recent.length > 0 ? (
          <div className="space-y-2">
            <p className="t-eyebrow px-2 pt-1">Recent</p>
            <LeafRows leaves={recent} />
          </div>
        ) : (
          <p className="t-subhead px-2 py-3 text-ui-label-2">Nothing on the map yet.</p>
        )}
      </Sheet>
    </div>
  );
}
