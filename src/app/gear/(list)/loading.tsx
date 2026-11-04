import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';

export default function GearLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card title="Gear">
          <p className="text-sm">Loading the gear list.</p>
        </Card>
      </div>
    </PageWrapper>
  );
}
