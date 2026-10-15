import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function PhotoLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Photo">
          <p className="text-sm">Loading this photo.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
