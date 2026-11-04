import Link from 'next/link';
import { Card } from '@/components/hub/Card';

export default function NotFound() {
  return (
    <div className="page-frame mt-[var(--bar-h)] min-h-[calc(100dvh-var(--bar-h)-var(--tab-h))]">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card title="Not found">
          <p className="text-sm font-bold">That page is not here.</p>
          <p className="mt-3 text-sm">
            <Link href="/" className="font-bold underline">Home</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
