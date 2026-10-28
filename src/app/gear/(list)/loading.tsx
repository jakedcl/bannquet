import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function GearLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Gear">
          <p className="text-sm">Loading the gear list.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
