import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function PeaksLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Window title="Peaks">
          <p className="text-sm">Loading the peaks.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
