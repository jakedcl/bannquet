import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { LoadingLines } from '@/components/ui/LoadingLines';
import { HubPage } from '@/components/hub/Page';

export default function StockingLoading() {
  return (
    <PageWrapper>
      <HubPage title="Stocking" width="6xl">
        <Card>
          <LoadingLines label="Loading stocking reports." />
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
