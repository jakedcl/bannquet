import Link from 'next/link';
import { Avatar } from '@/components/hub/Avatar';
import { buttonClass, tagClass } from '@/components/hub/Button';
import { Card } from '@/components/hub/Card';
import { ChevronIcon } from '@/components/hub/Icons';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { Notice } from '@/components/hub/Notice';
import { SmallPhotoImage } from '@/components/ui/SmallPhotoImage';

export type CommunityPeek = {
  photos: { id: string; url: string; thumbUrl: string | null; caption: string | null }[];
  posts: { id: string; title: string; byline: string }[];
  chat: { id: string; name: string; handle: string | null; body: string }[];
  /** Pins and routes, newest first. `tag` is the kind label (Route, Trailhead, ...). */
  feed: { id: string; href: string; title: string; byline: string; tag: string }[];
  peaks: { slug: string; name: string; detail: string | null }[];
  members: { id: string; name: string; handle: string | null; avatarUrl: string | null }[];
};

export function emptyPeek(): CommunityPeek {
  return { photos: [], posts: [], chat: [], feed: [], peaks: [], members: [] };
}

function Empty({ children, action }: { children: string; action?: React.ReactNode }) {
  return <Notice action={action}>{children}</Notice>;
}

/** The Community page body, in the order of the design board. */
export function CommunityBoard({ peek, canCreate }: { peek: CommunityPeek; canCreate: boolean }) {
  return (
    <div className="space-y-4">
      <Card title="Photos" action={<SeeAll href="/photos" />}>
        {peek.photos.length === 0 ? (
          <Empty>No photos yet.</Empty>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {peek.photos.map((photo, index) => (
              <Link
                key={photo.id}
                href={`/photos/${photo.id}`}
                className={`panel block aspect-square !border-2 ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
              >
                <SmallPhotoImage url={photo.url} thumbUrl={photo.thumbUrl} alt={photo.caption ?? 'Photo'} width={320} height={320} className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {canCreate ? <Link href="/upload?kind=photo" className={buttonClass('yellow')}>Add a photo</Link> : null}
          <Link href="/photos" className={buttonClass('gray')}>Open gallery</Link>
        </div>
      </Card>

      <Card title="Posts" action={<SeeAll href="/posts" />} padded={false}>
        {peek.posts.length === 0 ? (
          <div className="p-3"><Empty>No posts yet.</Empty></div>
        ) : (
          <ListGroup bare>
            {peek.posts.map((post) => (
              <ListRow key={post.id} href={`/posts/${post.id}`} title={post.title} subtitle={post.byline} />
            ))}
          </ListGroup>
        )}
        <div className="flex flex-wrap gap-2 border-t border-hairline p-3">
          {canCreate ? <Link href="/upload?kind=post" className={buttonClass('yellow')}>Write a post</Link> : null}
          <Link href="/posts" className={buttonClass('gray')}>All posts</Link>
        </div>
      </Card>

      <Card title="Chat" action={<Link href="/chat" className="no-underline">Open ›</Link>}>
        {peek.chat.length === 0 ? (
          <Empty>No messages yet.</Empty>
        ) : (
          <ul className="space-y-2.5">
            {peek.chat.map((message) => (
              <li key={message.id} className="min-w-0">
                <p className="text-caption text-ink-2">{message.name}</p>
                <p className="tile inline-block max-w-full px-3 py-1.5 text-meta [overflow-wrap:anywhere]">{message.body || '…'}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Pins and routes" action={<SeeAll href="/map" label="Map" />} padded={false}>
        {peek.feed.length === 0 ? (
          <div className="p-3"><Empty>No pins or routes yet.</Empty></div>
        ) : (
          <ListGroup bare>
            {peek.feed.map((item) => (
              <ListRow
                key={`${item.tag}-${item.id}`}
                href={item.href}
                title={item.title}
                subtitle={item.byline}
                trailing={<span className={tagClass('arrow')}>{item.tag}</span>}
              />
            ))}
          </ListGroup>
        )}
      </Card>

      <Card title="Peaks we have been to" action={<SeeAll href="/peaks" />} padded={false}>
        {peek.peaks.length === 0 ? (
          <div className="p-3"><Empty>No peaks logged yet.</Empty></div>
        ) : (
          <ListGroup bare>
            {peek.peaks.map((peak) => (
              <ListRow key={peak.slug} href={`/peaks/${peak.slug}`} title={peak.name} subtitle={peak.detail ?? undefined} />
            ))}
          </ListGroup>
        )}
      </Card>

      <Card title="Members" action={<SeeAll href="/members" />}>
        {peek.members.length === 0 ? (
          <Empty>No members yet.</Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {peek.members.map((member) => {
              const body = (
                <>
                  <Avatar name={member.name} src={member.avatarUrl} size={28} />
                  <span className="min-w-0 truncate text-meta">{member.name}</span>
                </>
              );
              return (
                <li key={member.id} className="min-w-0">
                  {member.handle ? (
                    <Link href={`/user/${member.handle}`} className="tile flex min-h-11 max-w-full items-center gap-2 px-2.5 no-underline">{body}</Link>
                  ) : (
                    <span className="tile flex min-h-11 max-w-full items-center gap-2 px-2.5">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SeeAll({ href, label = 'See all' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="-my-2 inline-flex min-h-11 items-center gap-1 no-underline">
      {label} <ChevronIcon className="h-2.5 w-1.5" />
    </Link>
  );
}
