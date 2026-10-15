import PageWrapper from '@/components/ui/PageWrapper';
import { MountainWeather } from '@/components/weather/MountainWeather';

export default function MountainWeatherPage() {
  return (
    <PageWrapper className="bg-gray-50">
      <MountainWeather />
    </PageWrapper>
  );
}
