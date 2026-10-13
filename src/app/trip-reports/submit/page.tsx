import type { Metadata } from 'next';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button, Window } from '@/components/retro';

export const metadata: Metadata = {
  title: 'Submit Trip Report | Bannquet',
  description: 'Trip report posting is paused while Bannquet moves off Sanity.',
};

export default function SubmitTripReportPage() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Window title="Posting is paused">
          <p className="mb-4 leading-relaxed text-gray-800">
            The old email-link editor is gone with Sanity. New reports will be a simple form on the site once friend accounts are in.
          </p>
          <Button tone="yellow" href="/trip-reports">Read trip reports</Button>
        </Window>
      </div>
    </PageWrapper>
  );
}
