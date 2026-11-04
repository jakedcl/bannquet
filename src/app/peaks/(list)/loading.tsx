import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { HubPage } from '@/components/hub/Page';

export default function PeaksLoading() {
  return (
    <PageWrapper>
      <HubPage title="Peaks" width="5xl">
        <Card>
          <p className="text-sm">Loading the peaks.</p>
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
