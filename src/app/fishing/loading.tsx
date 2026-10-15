import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function FishingLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Window title="Mountain fishing">
          <p className="text-sm">Loading mountain gauges.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
