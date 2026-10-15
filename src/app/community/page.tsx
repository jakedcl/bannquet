import PageWrapper from '@/components/ui/PageWrapper';
import { Button } from '@/components/retro/Button';
import { Window } from '@/components/retro/Window';
import { COMMUNITY_LINKS } from '@/lib/sections';

export default function CommunityPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Community">
          <p className="mb-4 text-sm text-gray-700">
            Chat, the peak list, trips, and shared gear. Trip reports stay with the person who wrote them.
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_LINKS.map((item) => (
              <Button key={item.href} href={item.href} tone="blue">{item.label}</Button>
            ))}
          </div>
        </Window>
      </div>
    </PageWrapper>
  );
}
