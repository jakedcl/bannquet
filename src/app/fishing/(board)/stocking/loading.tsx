import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';
import { LoadingLines } from '@/components/ui/LoadingLines';

export default function StockingLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Card title="Stocking">
          <LoadingLines label="Loading stocking reports." />
        </Card>
      </div>
    </PageWrapper>
  );
}
