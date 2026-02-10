'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import TripSubmitForm from '@/components/trip-reports/TripSubmitForm';

function EditTripReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripData, setTripData] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const id = searchParams.get('id');

    if (!token || !id) {
      setError('Missing edit token or trip report ID');
      setLoading(false);
      return;
    }

    fetchTripForEdit(token, id);
  }, [searchParams]);

  const fetchTripForEdit = async (token: string, id: string) => {
    try {
      const response = await fetch(`/api/trip-reports/edit?token=${token}&id=${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load trip report');
      }

      setTripData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green"></div>
            <p className="mt-4 text-gray-600">Loading trip report...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error || !tripData) {
    return (
      <PageWrapper className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Trip report not found'}</p>
            <a
              href="/trip-reports"
              className="text-brand-green hover:underline font-medium"
            >
              ← Back to Trip Reports
            </a>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Trip Report</h1>
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <TripSubmitForm 
            initialData={tripData} 
            editToken={searchParams.get('token')} 
            tripId={searchParams.get('id')} 
          />
        </div>
      </div>
    </PageWrapper>
  );
}

export default function EditTripReportPage() {
  return (
    <Suspense fallback={
      <PageWrapper className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </PageWrapper>
    }>
      <EditTripReportContent />
    </Suspense>
  );
}
