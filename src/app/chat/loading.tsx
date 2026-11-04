import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { HubPage } from '@/components/hub/Page';

export default function ChatLoading() {
  return (
    <PageWrapper>
      <HubPage title="Chat" width="3xl">
        <Card>
          <p className="text-sm">Loading chat.</p>
        </Card>
      </HubPage>
    </PageWrapper>
  );
}
