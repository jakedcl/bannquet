import PageWrapper from '@/components/ui/PageWrapper';
import { HubPage } from '@/components/hub/Page';
import { getViewer } from '@/app/sign-in/actions';
import { CommunityBoard, type CommunityPeek } from '@/components/community/CommunityBoard';
import { isDatabaseConfigured } from '@/db';
import { allPeaks } from '@/lib/challenges';
import { listChatMessages } from '@/lib/chat';
import { listTopGearByHolds } from '@/lib/gear';
import { listTopMembersByPeaks } from '@/lib/members-directory';
import { loadMapData, type MapFeatureCollection } from '@/lib/posts';
import { popularPeaksByFriends } from '@/lib/summits';
import { listPostsPeek } from '@/lib/feed-posts';

export const dynamic = 'force-dynamic';

const EMPTY: MapFeatureCollection = { type: 'FeatureCollection', features: [] };
const PEEK = 4;

function clip(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 72) return clean;
  return `${clean.slice(0, 71)}…`;
}

function emptyPeek(): CommunityPeek {
  return { chat: [], peaks: [], posts: [], members: [], gear: [], points: EMPTY, lines: EMPTY };
}

async function loadPeek(viewerId: string | null): Promise<CommunityPeek> {
  const peakNames = new Map(allPeaks().map((peak) => [peak.slug, peak.name]));
  const [messages, popularPeaks, posts, members, gear, map] = await Promise.all([
    listChatMessages(null, PEEK),
    popularPeaksByFriends(PEEK),
    listPostsPeek(PEEK),
    listTopMembersByPeaks(PEEK),
    listTopGearByHolds(PEEK),
    loadMapData(viewerId),
  ]);

  return {
    chat: messages.slice(-PEEK).map((message) => ({
      id: message.id,
      name: message.name,
      handle: message.handle,
      body: clip(message.body || message.ref?.label || ''),
    })),
    peaks: popularPeaks.map((row) => ({
      slug: row.peakSlug,
      name: peakNames.get(row.peakSlug) ?? row.peakSlug,
      detail: row.friends === 1 ? '1 friend' : `${row.friends} friends`,
    })),
    posts: posts.map((post) => ({
      id: post.id,
      title: post.title,
      when: post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
    })),
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      handle: member.handle,
      detail: member.peaks > 0 ? `${member.peaks} ${member.peaks === 1 ? 'peak' : 'peaks'}` : null,
    })),
    gear: gear.map((item) => {
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
      const viewer = await getViewer();
      peek = await loadPeek(viewer?.id ?? null);
    } catch {
      note = 'Community did not load.';
    }
  }

  return (
    <PageWrapper>
      <HubPage title="Community" width="5xl">
        {note ? <p className="t-body font-bold">{note}</p> : null}
        <CommunityBoard peek={peek} />
      </HubPage>
    </PageWrapper>
  );
}
