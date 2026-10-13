import type { Metadata } from 'next';
import PageWrapper from '@/components/ui/PageWrapper';
import { Button, Window } from '@/components/retro';

export const metadata: Metadata = {
  title: 'Edit Trip Report | Bannquet',
  description: 'Email edit links from the old trip report flow no longer open an editor.',
};

export default function EditTripReportPage() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Window title="Edit links expired">
          <p className="mb-4 leading-relaxed text-gray-800">
            Those email edit links belonged to the Sanity workflow. Editing comes back as an in-site form.
          </p>
          <Button tone="blue" href="/trip-reports">Back to trip reports</Button>
        </Window>
      </div>
    </PageWrapper>
  );
}
