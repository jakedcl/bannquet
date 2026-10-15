import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';

export default function MountainWeatherLoading() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Window title="Regional mountain weather">
          <p className="text-sm">Loading the conditions and the forecast.</p>
        </Window>
      </div>
    </PageWrapper>
  );
}
