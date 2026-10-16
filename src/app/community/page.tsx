import PageWrapper from '@/components/ui/PageWrapper';
import { CommunityBoard, type CommunityPeek } from '@/components/community/CommunityBoard';
import { isDatabaseConfigured } from '@/db';
import { allPeaks } from '@/lib/challenges';
import { listChatMessages } from '@/lib/chat';
import { listGear } from '@/lib/gear';
import { listApprovedMembers } from '@/lib/members-directory';
import { loadMapData, type MapFeatureCollection } from '@/lib/posts';
import { listClimbs } from '@/lib/summits';
import { listTrips } from '@/lib/trips';
import { formatTripDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };
const PEEK = 4;

function clip(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 72) return clean;
  return `${clean.slice(0, 71)}…`;
}

function emptyPeek(): CommunityPeek {
  return { chat: [], peaks: [], trips: [], members: [], gear: [], points: EMPTY, lines: EMPTY };
}

async function loadPeek(): Promise<CommunityPeek> {
  const [messages, climbs, trips, members, gear, map] = await Promise.all([
    listChatMessages(),
    listClimbs(),
    listTrips(),
    listApprovedMembers(),
    listGear(),
    loadMapData(),
  ]);
  const peaks = allPeaks();
  const bySlug = new Map(peaks.map((peak) => [peak.slug, peak]));
  const recent: CommunityPeek['peaks'] = [];
  const seen = new Set<string>();
  for (let index = climbs.length - 1; index >= 0 && recent.length < PEEK; index -= 1) {
    const climb = climbs[index];
    if (seen.has(climb.peakSlug)) continue;
    const peak = bySlug.get(climb.peakSlug);
    if (!peak) continue;
    seen.add(climb.peakSlug);
    recent.push({
      slug: peak.slug,
      name: peak.name,
      who: climb.name,
      handle: climb.handle,
      detail: null,
    });
  }
  const peakRows = recent.length > 0 ? recent : [...peaks]
    .sort((a, b) => b.elevationFt - a.elevationFt)
    .slice(0, PEEK)
    .map((peak) => ({
      slug: peak.slug,
      name: peak.name,
      who: null,
      handle: null,
      detail: `${peak.elevationFt.toLocaleString('en-US')} ft`,
    }));

  return {
    chat: messages.slice(-PEEK).map((message) => ({
      id: message.id,
      name: message.name,
      handle: message.handle,
      body: clip(message.body || message.ref?.label || ''),
    })),
    peaks: peakRows,
    trips: trips.slice(0, PEEK).map((trip) => ({
      id: trip.id,
      title: trip.title,
      when: trip.tripDate ? formatTripDate(trip.tripDate) : null,
    })),
    members: [...members]
      .sort((a, b) => b.climbs - a.climbs || a.name.localeCompare(b.name))
      .slice(0, PEEK)
      .map((member) => ({
        id: member.id,
        name: member.name,
        handle: member.handle,
        detail: member.climbs > 0 ? `${member.climbs} climbs` : null,
      })),
    gear: [...gear]
      .sort((a, b) => {
        const held = (item: typeof a) => item.holds.reduce((sum, hold) => sum + hold.qty, 0);
        return held(b) - held(a) || a.name.localeCompare(b.name);
      })
      .slice(0, PEEK)
      .map((item) => {
        const qty = item.holds.reduce((sum, hold) => sum + hold.qty, 0);
        return { id: item.id, name: item.name, detail: qty > 0 ? String(qty) : null };
      }),
    points: map.points,
    lines: map.lines,
  };
}

export default async function CommunityPage() {
  let peek = emptyPeek();
  let note: string | null = null;
  if (!isDatabaseConfigured()) {
    note = 'Postgres is not connected.';
  } else {
    try {
      peek = await loadPeek();
    } catch {
      note = 'Community did not load.';
    }
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl px-4 py-4">
        {note ? <p className="mb-3 text-sm font-bold">{note}</p> : null}
        <CommunityBoard peek={peek} />
      </div>
    </PageWrapper>
  );
}
