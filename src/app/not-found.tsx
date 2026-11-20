import Link from 'next/link';
import { Card } from '@/components/hub/Card';
import { buttonClass } from '@/components/hub/Button';
import { HubPage } from '@/components/hub/Page';

export default function NotFound() {
  return (
    <div className="page-frame mt-[var(--bar-h)] min-h-[calc(100dvh-var(--bar-h))]">
      <HubPage title="Not found" width="3xl">
        <Card>
          <p className="t-body">That page is not here.</p>
          <Link href="/" className={buttonClass('yellow', 'md', 'mt-4')}>Back to Home</Link>
        </Card>
      </HubPage>
    </div>
  );
}
