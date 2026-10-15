import PageWrapper from '@/components/ui/PageWrapper';
import { MountainWeather } from '@/components/weather/MountainWeather';

export default async function MountainWeatherPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return (
    <PageWrapper className="bg-gray-50">
      <MountainWeather state={state} />
    </PageWrapper>
  );
}
