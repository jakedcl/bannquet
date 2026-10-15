import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';

const LINKS = [
  { href: '/chat', label: 'Chat' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/trips', label: 'Trips' },
] as const;

export default function CommunityPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Community">
          <p className="mb-4 text-sm text-gray-700">
            Chat, the peak list, and trips. Trip reports stay with the person who wrote them.
            Shared gear is on the <Link href="/gear" className="underline">gear list</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((item) => (
              <Button key={item.href} href={item.href} tone="blue">{item.label}</Button>
            ))}
            <Button href="/gear" tone="blue">Gear</Button>
          </div>
        </Window>
      </div>
    </PageWrapper>
  );
}
