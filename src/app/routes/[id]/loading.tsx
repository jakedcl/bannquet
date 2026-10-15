import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function RouteLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Window title="Route">
          <p className="text-sm">Loading this route.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
