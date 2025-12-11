'use client';

import { useState, useEffect } from 'react';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import Link from 'next/link';
import { PinSubmission } from '@/components/adk-map/types';

export default function AdminPinsDebugPage() {
  const [submissions, setSubmissions] = useState<PinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check admin access
  useEffect(() => {
    // Get user session
    const savedSession = localStorage.getItem('adkMapUserSession');
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        
        // Redirect if not admin
        if (!session.isAdmin) {
          window.location.href = '/map';
        }
      } catch (err) {
        console.error('Error parsing user session:', err);
        window.location.href = '/map';
      }
    } else {
      // No session, redirect to map
      window.location.href = '/map';
    }
  }, []);
  
  // Load submissions directly with debug flag
  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      
      try {
        // Use the dedicated debug endpoint for raw access to the submissions file
        const response = await fetch('/api/debug/map-submissions');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch submissions: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Raw submissions data:", data);
        
        if (data.success && data.data) {
          setSubmissions(Array.isArray(data.data) ? data.data : []);
        } else {
          setSubmissions([]);
          setError(data.message || 'Failed to load submissions');
        }
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmissions();
  }, []);
  
  return (
    <AdminPageWrapper title="Submissions Debug">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Debug page for viewing raw submission data from map-submissions.json
          </p>
          <Link
            href="/admin/submissions"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md border border-transparent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Submissions Manager
          </Link>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          Error: {error}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Raw Submissions Data ({submissions.length} submissions found)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No submissions found in data store.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {submission.id || 'No ID'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                          submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.submitterEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <details>
                          <summary className="text-blue-600 hover:text-blue-800 cursor-pointer">
                            View Details
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs font-mono max-h-40 overflow-auto">
                            <pre>{JSON.stringify(submission, null, 2)}</pre>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
} 