import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { SectionList } from '@/components/ui/SectionList';
import { COMMUNITY_LINKS } from '@/lib/sections';

export default function CommunityPage() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Community">
          <p className="mb-4 text-sm text-gray-700">
            Chat, the peak list, trips, and shared gear. Trip reports stay with the person who wrote them.
          </p>
          <SectionList links={COMMUNITY_LINKS} label="Community" />
        </Window>
      </div>
    </PageWrapper>
  );
}
