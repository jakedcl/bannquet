import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Avatar } from '@/components/hub/Avatar';
import { PageHero } from '@/components/hub/PageHero';
import { Notice } from '@/components/hub/Notice';
import { getViewer } from '@/app/sign-in/actions';
import { viewerCanContribute } from '@/lib/membership';
import { CommunityBoard, emptyPeek, type CommunityPeek } from '@/components/community/CommunityBoard';
import { isDatabaseConfigured } from '@/db';
import { allPeaks } from '@/lib/challenges';
import { listChatMessages } from '@/lib/chat';
import { listGalleryPhotos } from '@/lib/gallery';
import { listApprovedMembers } from '@/lib/members-directory';
import { loadMapData } from '@/lib/posts';
import { PIN_KIND_LABELS, isPinKind } from '@/lib/pin-kinds';
import { recentCrewPeaks } from '@/lib/summits';
import { listPostsPeek } from '@/lib/feed-posts';

export const metadata = { title: 'Community' };

export const dynamic = 'force-dynamic';

const PHOTOS = 9;
const POSTS = 3;
const CHAT = 3;
const FEED = 5;
const PEAKS = 5;
const MEMBERS = 12;

function clip(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 90) return clean;
  return `${clean.slice(0, 89)}…`;
}

function shortDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function loadPeek(viewerId: string | null): Promise<CommunityPeek> {
  const peakNames = new Map(allPeaks().map((peak) => [peak.slug, peak.name]));
  const [gallery, posts, messages, map, peakSlugs, members] = await Promise.all([
    listGalleryPhotos({ handle: null, before: null }),
    listPostsPeek(POSTS),
    listChatMessages(null, CHAT),
    loadMapData(viewerId),
    recentCrewPeaks(PEAKS),
    listApprovedMembers(),
  ]);

  const feed = map.points.features
    .filter((feature) => feature.properties.kind !== 'photo' && feature.properties.href)
    .sort((a, b) => String(b.properties.date ?? '').localeCompare(String(a.properties.date ?? '')))
    .slice(0, FEED)
    .map((feature, index) => {
      const kind = String(feature.properties.kind ?? '');
      const date = shortDate(feature.properties.date == null ? null : String(feature.properties.date));
      return {
        id: String(feature.properties.trackId || feature.properties.href || index),
        href: String(feature.properties.href),
        title: String(feature.properties.title ?? 'Untitled'),
        byline: [feature.properties.who, date].filter(Boolean).join(' · '),
        tag: kind === 'route' ? 'Route' : isPinKind(kind) ? PIN_KIND_LABELS[kind] : 'Pin',
      };
    });

  return {
    photos: gallery.photos.slice(0, PHOTOS),
    posts: posts.map((post) => ({
      id: post.id,
      title: post.title,
      byline: [post.authorName, shortDate(post.createdAt)].filter(Boolean).join(' · '),
    })),
    chat: messages.slice(-CHAT).map((message) => ({
      id: message.id,
      name: message.name,
      handle: message.handle,
      body: clip(message.body || message.ref?.label || ''),
    })),
    feed,
    peaks: peakSlugs.map((slug) => ({ slug, name: peakNames.get(slug) ?? slug, detail: null })),
    members: members
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MEMBERS)
      .map((member) => ({ id: member.id, name: member.name, handle: member.handle, avatarUrl: member.avatarUrl })),
  };
}

export default async function CommunityPage() {
  const viewer = await getViewer();
  const canCreate = viewerCanContribute(viewer);
  let peek = emptyPeek();
  let note: string | null = null;
  if (!isDatabaseConfigured()) {
    note = 'Postgres is not connected, so the community cannot load.';
  } else {
    try {
      peek = await loadPeek(viewer?.id ?? null);
    } catch {
      note = 'Community did not load. Try again in a minute.';
    }
  }

  // The avatar button opens the viewer's profile (settings, edit profile, log out).
  const profileHref = viewer ? (viewer.handle ? `/user/${viewer.handle}` : '/account') : null;

  return (
    <PageWrapper>
      <PageHero
        eyebrow="Photos, posts, chat and pins"
        title="Community"
        innerClassName="max-w-3xl"
        trailing={
          profileHref && viewer ? (
            <Link href={profileHref} className="flex flex-col items-center gap-0.5 no-underline" aria-label="Your profile">
              <Avatar name={viewer.displayName ?? viewer.handle ?? '?'} src={viewer.avatarUrl ?? null} size={40} />
              <span className="eyebrow text-yellow">Profile</span>
            </Link>
          ) : null
        }
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        {note ? <Notice tone="error">{note}</Notice> : null}
        <CommunityBoard peek={peek} canCreate={canCreate} />
      </div>
    </PageWrapper>
  );
}
