import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { LoadingLines } from '@/components/ui/LoadingLines';

export default function FishingLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Window title="Mountain fishing">
          <LoadingLines label="Loading mountain gauges." />
        </Window>
      </div>
    </PageWrapper>
  );
}
