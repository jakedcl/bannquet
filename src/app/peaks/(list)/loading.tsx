import PageWrapper from '@/components/ui/PageWrapper';
import { Card } from '@/components/hub/Card';

export default function PeaksLoading() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card title="Peaks">
          <p className="text-sm">Loading the peaks.</p>
        </Card>
      </div>
    </PageWrapper>
  );
}
