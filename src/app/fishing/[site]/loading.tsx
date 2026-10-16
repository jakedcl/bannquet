import { Window } from '@/components/retro/Window';
import { LoadingLines } from '@/components/ui/LoadingLines';
import PageWrapper from '@/components/ui/PageWrapper';

export default function FishingSpotLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Gauge">
          <LoadingLines label="Loading the gauge." />
        </Window>
      </div>
    </PageWrapper>
  );
}
