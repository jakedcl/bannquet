import type { Metadata } from 'next';
import PageWrapper from '@/components/ui/PageWrapper';
import TripSubmitForm from '@/components/trip-reports/TripSubmitForm';

export const metadata: Metadata = {
  title: 'Submit Trip Report | Bannquet',
  description: 'Share your mountain adventure with the crew',
};

export default function SubmitTripReportPage() {
  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-6 mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-green/70">submit</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Trip Report
          </h1>
          <p className="text-gray-600">
            Include location, weather, details, photos, etc below.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <TripSubmitForm />
        </div>
      </div>
    </PageWrapper>
  );
}
