import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function ProfileSectionLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Profile">
          <p className="text-sm">Loading this list.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
