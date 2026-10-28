'use client';

import { useRouter } from 'next/navigation';
import { FilterPills } from '@/components/ui/FilterPills';

export function PhotoMemberFilter({ value, members }: { value: string; members: Array<{ handle: string; name: string }> }) {
  const router = useRouter();
  return (
    <FilterPills
      label="Whose photos"
      value={value}
      options={[{ id: '', label: 'Everyone' }, ...members.map((member) => ({ id: member.handle, label: member.name }))]}
      onChange={(id) => router.push(id ? `/photos?who=${encodeURIComponent(id)}` : '/photos')}
    />
  );
}
