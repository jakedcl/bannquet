import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';

const LINKS = [
  { href: '/posts', label: 'Posts' },
  { href: '/peaks', label: 'Peaks' },
  { href: '/stats', label: 'Stats' },
  { href: '/trips', label: 'Trips' },
  { href: '/map', label: 'Map' },
] as const;

export default function CommunityPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Community">
          <p className="mb-4 text-sm text-gray-700">
            Posts, the peak lists, stats, trips, and the map.
          </p>
          <div className="flex flex-wrap gap-2">
            {LINKS.map((item) => (
              <Button key={item.href} href={item.href}>{item.label}</Button>
            ))}
          </div>
        </Window>
      </div>
    </PageWrapper>
  );
}
