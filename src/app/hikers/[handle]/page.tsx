import Image from 'next/image';
import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Badge } from '@/components/retro/Badge';
import { Window } from '@/components/retro/Window';
import { findMemberByHandle } from '@/lib/auth/members';
import { ACTIVITY_META } from '@/lib/activities';
import { REGION_LABELS, isRegionCode } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export default async function HikerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const member = await findMemberByHandle(handle);
  if (!member) notFound();

  const name = member.displayName || member.handle || 'Friend';
  const region = member.homeRegion && isRegionCode(member.homeRegion) ? REGION_LABELS[member.homeRegion] : null;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-lg px-4 py-10">
        <Window title={name}>
          <div className="flex items-start gap-4">
            {member.avatarUrl ? (
              <Image
                src={member.avatarUrl}
                alt=""
                width={88}
                height={88}
                className="retro-box h-[88px] w-[88px] object-cover"
              />
            ) : (
              <div className="retro-box flex h-[88px] w-[88px] items-center justify-center bg-beige text-2xl font-bold">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-gray-600">@{member.handle}</p>
              {region ? <p className="text-sm">Home: {region}</p> : null}
            </div>
          </div>
          {member.bio ? <p className="mt-4 whitespace-pre-wrap text-sm">{member.bio}</p> : null}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide">Favorite activities</p>
            {member.favoriteActivities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {member.favoriteActivities.map((activity) => (
                  <Badge key={activity}>{ACTIVITY_META[activity].label}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No favorite activities yet.</p>
            )}
          </div>
        </Window>
      </div>
    </PageWrapper>
  );
}
