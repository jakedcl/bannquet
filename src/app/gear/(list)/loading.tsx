import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { HubPage } from '@/components/hub/Page';

export default function GearLoading() {
  return (
    <PageWrapper>
      <HubPage title="Gear" width="3xl">
        <Card>
          <p className="text-sm">Loading the gear list.</p>
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
