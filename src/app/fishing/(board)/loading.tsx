import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { LoadingLines } from '@/components/ui/LoadingLines';
import { HubPage } from '@/components/hub/Page';

export default function FishingLoading() {
  return (
    <PageWrapper>
      <HubPage title="Mountain fishing" width="6xl">
        <Card>
          <LoadingLines label="Loading mountain gauges." />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
