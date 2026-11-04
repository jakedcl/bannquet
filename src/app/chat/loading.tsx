import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';

export default function ChatLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card title="Chat">
          <p className="text-sm">Loading chat.</p>
        </Card>
      </div>
    </PageWrapper>
  );
}
