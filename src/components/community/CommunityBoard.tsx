import Link from 'next/link';
import { MapCanvas } from '@/components/map/MapCanvas';
import { DashboardGrid } from '@/components/ui/DashboardGrid';
import { DashboardWindow } from '@/components/ui/DashboardWindow';
import type { MapFeatureCollection } from '@/lib/posts';

export type CommunityPeek = {
  chat: { id: string; name: string; handle: string | null; body: string }[];
  peaks: { slug: string; name: string; who: string | null; handle: string | null; detail: string | null }[];
  trips: { id: string; title: string; when: string | null }[];
  members: { id: string; name: string; handle: string | null; detail: string | null }[];
  gear: { id: string; name: string; detail: string | null }[];
  points: MapFeatureCollection;
  lines: MapFeatureCollection;
};

function NameLink({ href, children }: { href: string | null; children: string }) {
  if (!href) return <span className="font-bold">{children}</span>;
  return <Link href={href} className="font-bold underline">{children}</Link>;
}

function Empty() {
  return <p className="text-sm">Nothing yet.</p>;
}

export function CommunityBoard({ peek }: { peek: CommunityPeek }) {
  return (
    <DashboardGrid>
      <DashboardWindow title="Chat" href="/chat">
        {peek.chat.length === 0 ? <Empty /> : (
          <ul className="space-y-1 text-sm">
            {peek.chat.map((message) => (
              <li key={message.id} className="min-w-0 truncate">
                <NameLink href={message.handle ? `/user/${message.handle}` : null}>{message.name}</NameLink>
                {message.body ? <span> {message.body}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardWindow>

      <DashboardWindow title="Peaks" href="/peaks">
        {peek.peaks.length === 0 ? <Empty /> : (
          <ul className="space-y-1 text-sm">
            {peek.peaks.map((peak) => (
              <li key={peak.slug} className="flex min-w-0 items-baseline justify-between gap-2">
                <Link href={`/peaks/${peak.slug}`} className="min-w-0 truncate font-bold underline">{peak.name}</Link>
                {peak.who ? (
                  peak.handle ? (
                    <Link href={`/user/${peak.handle}`} className="shrink-0 underline">{peak.who}</Link>
                  ) : (
                    <span className="shrink-0">{peak.who}</span>
                  )
                ) : peak.detail ? (
                  <span className="shrink-0">{peak.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardWindow>

      <DashboardWindow title="Trips" href="/trips">
        {peek.trips.length === 0 ? <Empty /> : (
          <ul className="space-y-1 text-sm">
            {peek.trips.map((trip) => (
              <li key={trip.id} className="flex min-w-0 items-baseline justify-between gap-2">
                <Link href={`/trips/${trip.id}`} className="min-w-0 truncate font-bold underline">{trip.title}</Link>
                {trip.when ? <span className="shrink-0">{trip.when}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardWindow>

      <DashboardWindow title="Members" href="/members">
        {peek.members.length === 0 ? <Empty /> : (
          <ul className="space-y-1 text-sm">
            {peek.members.map((member) => (
              <li key={member.id} className="flex min-w-0 items-baseline justify-between gap-2">
                <NameLink href={member.handle ? `/user/${member.handle}` : null}>{member.name}</NameLink>
                {member.detail ? <span className="shrink-0">{member.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardWindow>

      <DashboardWindow title="Gear" href="/gear">
        {peek.gear.length === 0 ? <Empty /> : (
          <ul className="space-y-1 text-sm">
            {peek.gear.map((item) => (
              <li key={item.id} className="flex min-w-0 items-baseline justify-between gap-2">
                <Link href={`/gear/${item.id}`} className="min-w-0 truncate font-bold underline">{item.name}</Link>
                {item.detail ? <span className="shrink-0">{item.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardWindow>

      <DashboardWindow title="Map" href="/map">
        <div className="pointer-events-none h-36 w-full">
          <MapCanvas points={peek.points} lines={peek.lines} preview />
        </div>
      </DashboardWindow>
    </DashboardGrid>
  );
}
