import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function PeakLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Peak">
          <p className="text-sm">Loading this peak.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
