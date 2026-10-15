import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function StockingLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Window title="Stocking">
          <p className="text-sm">Loading stocking reports.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
