'use client';

import { useState, useEffect } from 'react';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import { PinSubmission } from '@/components/projects/adk-map/types';
import { categories } from '@/components/projects/adk-map/MarkerStyle';
import Link from 'next/link';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<PinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'addition' | 'deletion'>('all');

  // Fetch submissions on component mount
  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Fetch submissions from the API
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use requestTypeFilter if not 'all'
      const url = requestTypeFilter !== 'all' 
        ? `/api/map-submissions?requestType=${requestTypeFilter}`
        : '/api/map-submissions';
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      setSubmissions(data);
      console.log("Loaded submissions:", data);
    } catch (err) {
      setError('Error loading submissions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions when filter changes
  useEffect(() => {
    fetchSubmissions();
  }, [requestTypeFilter]);

  // Handle approve submission
  const handleApprove = async (id: string) => {
    if (!id) {
      console.error("Cannot approve submission: missing ID");
      return;
    }
    
    setProcessingId(id);
    
    try {
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      const response = await fetch(`/api/map-submissions?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.email}`
        },
        body: JSON.stringify({
          id: id,
          status: 'approved'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve submission');
      }
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
      toast.textContent = `Submission has been approved.`;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      // Refresh submissions list
      await fetchSubmissions();
    } catch (err) {
      setError('Failed to approve submission');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject submission
  const handleReject = async (id: string) => {
    if (!id) {
      console.error("Cannot reject submission: missing ID");
      return;
    }
    
    setProcessingId(id);
    
    try {
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      const response = await fetch(`/api/map-submissions?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.email}`
        },
        body: JSON.stringify({
          id: id,
          status: 'rejected'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject submission');
      }
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
      toast.textContent = `Submission has been rejected.`;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      // Refresh submissions list
      await fetchSubmissions();
    } catch (err) {
      setError('Failed to reject submission');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Get category name by id
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter submissions by status and request type
  const filteredSubmissions = submissions.filter(sub => {
    if (activeTab === 'pending') {
      return sub.status === 'pending';
    } else {
      return sub.status === 'approved' || sub.status === 'rejected';
    }
  });

  return (
    <AdminPageWrapper title="Pin Submissions">
      <div className="mb-6">
        <Link 
          href="/admin/pins" 
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Pin Directory
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'pending'
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Waiting Approval
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            className={`py-3 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'processed'
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Processed Requests
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by request type:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setRequestTypeFilter('all')}
              className={`px-3 py-1 text-xs rounded-full ${
                requestTypeFilter === 'all'
                  ? 'bg-brand-green text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRequestTypeFilter('addition')}
              className={`px-3 py-1 text-xs rounded-full ${
                requestTypeFilter === 'addition'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Additions
            </button>
            <button
              onClick={() => setRequestTypeFilter('deletion')}
              className={`px-3 py-1 text-xs rounded-full ${
                requestTypeFilter === 'deletion'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Deletions
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green"></div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-600">
          {error}
          <button 
            onClick={fetchSubmissions} 
            className="ml-2 text-brand-green hover:underline"
          >
            Try Again
          </button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {activeTab === 'pending' ? 'pending' : 'processed'} submissions found.
          {requestTypeFilter !== 'all' && ` Try changing the filter.`}
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'pending' ? (
            // Pending submissions
            filteredSubmissions.map(submission => (
              <div 
                key={submission.id} 
                className={`border rounded-lg shadow-sm overflow-hidden ${
                  submission.requestType === 'deletion' 
                    ? 'border-red-200 bg-red-50/30' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex justify-between flex-wrap gap-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        submission.requestType === 'deletion' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <h3 className="font-medium text-lg text-gray-900">{submission.name}</h3>
                        <p className="text-sm text-brand-green">{getCategoryName(submission.categoryId)}</p>
                        <p className="text-xs text-gray-500">
                          {submission.requestType === 'addition' ? 'New location request' : 'Deletion request'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Submitted: {formatDate(submission.submittedAt)}
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Coordinates</p>
                      <p className="text-sm text-gray-700">{submission.coordinates.join(', ')}</p>
                    </div>
                    
                    {submission.elevation && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Elevation</p>
                        <p className="text-sm text-gray-700">{submission.elevation} ft</p>
                      </div>
                    )}
                    
                    {submission.description && (
                      <div className="sm:col-span-2 mt-2">
                        <p className="text-sm font-medium text-gray-500">Description</p>
                        <p className="text-sm text-gray-700">{submission.description}</p>
                      </div>
                    )}
                    
                    {submission.requestType === 'deletion' && submission.targetPinId && (
                      <div className="sm:col-span-2 mt-2">
                        <p className="text-sm font-medium text-gray-500">Target Pin ID</p>
                        <p className="text-sm text-gray-700">{submission.targetPinId}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center flex-wrap gap-3">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Submitted by:</span> {submission.submitterName} ({submission.submitterEmail})
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleReject(submission.id!)}
                          disabled={processingId === submission.id}
                          className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green ${
                            processingId === submission.id ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(submission.id!)}
                          disabled={processingId === submission.id}
                          className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-brand-green hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green ${
                            processingId === submission.id ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Processed submissions
            <div className="space-y-4">
              {filteredSubmissions.map(submission => (
                <div 
                  key={submission.id} 
                  className={`border rounded-lg overflow-hidden p-4 ${
                    submission.status === 'approved' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex justify-between flex-wrap gap-2">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        submission.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{submission.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.requestType === 'addition' ? 'New location' : 'Deletion request'} - {submission.status === 'approved' ? 'Approved' : 'Rejected'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.updatedAt ? formatDate(submission.updatedAt) : 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600">
                    <p>{getCategoryName(submission.categoryId)}</p>
                    {submission.description && <p className="mt-1">{submission.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminPageWrapper>
  );
} 