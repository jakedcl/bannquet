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
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'addition' | 'deletion'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch submissions on component mount
  useEffect(() => {
    console.log("Admin submissions page mounted, fetching submissions...");
    fetchSubmissions();
  }, []);

  // Fetch submissions from the API
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching submissions with filter:", requestTypeFilter);
      
      // Add debug parameter to get more detailed logging
      const params = new URLSearchParams();
      if (requestTypeFilter !== 'all') {
        params.append('requestType', requestTypeFilter);
      }
      params.append('debug', 'true'); // Add debug flag
      
      const url = `/api/map-submissions?${params.toString()}`;
      console.log("Fetching from URL:", url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Loaded submissions data:", data);
      
      // Check if the response is an array (as expected)
      if (!Array.isArray(data)) {
        console.error("Expected an array of submissions but got:", typeof data, data);
        throw new Error("Invalid response format: expected array of submissions");
      }
      
      setSubmissions(data);
      
      // Log breakdown of submissions by status
      const pendingCount = data.filter(sub => sub.status === 'pending').length;
      const approvedCount = data.filter(sub => sub.status === 'approved').length;
      const rejectedCount = data.filter(sub => sub.status === 'rejected').length;
      
      console.log(`Submissions breakdown - Total: ${data.length}, Pending: ${pendingCount}, Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Error loading submissions: ${errorMessage}`);
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions when filter changes
  useEffect(() => {
    fetchSubmissions();
  }, [requestTypeFilter]);

  // Filter submissions by the active tab (pending, approved, rejected)
  const filteredSubmissions = submissions.filter(sub => sub.status === activeTab);
  
  // Further filter by search query if present
  const searchFilteredSubmissions = searchQuery
    ? filteredSubmissions.filter(sub => 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.submitterEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredSubmissions;

  // Get category name from category ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Format date string to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

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

  // Debug information section to show submission counts
  const getSubmissionStats = () => {
    const approved = submissions.filter(sub => sub.status === 'approved').length;
    const pending = submissions.filter(sub => sub.status === 'pending').length;
    const rejected = submissions.filter(sub => sub.status === 'rejected').length;
    const legacy = submissions.filter(sub => sub.status === 'legacy').length;
    const total = submissions.length;
    
    return { approved, pending, rejected, legacy, total };
  };

  const stats = getSubmissionStats();

  return (
    <AdminPageWrapper title="Submission Manager">
      {/* Page description */}
      <div className="mb-8">
        <p className="text-gray-600">
          Manage user-submitted pins for the Adirondacks Map. Review, approve, or reject submissions.
        </p>
      </div>

      {/* Pin Submissions Container - Moved to top */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Pin Submissions</h2>
        <p className="text-gray-600">Review and manage user-submitted locations</p>
        
        {/* Debug Stats */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <div>Total submissions: {stats.total}</div>
          <div className="flex space-x-4 mt-1">
            <span className="text-green-600">Approved: {stats.approved}</span>
            <span className="text-yellow-600">Pending: {stats.pending}</span>
            <span className="text-red-600">Rejected: {stats.rejected}</span>
            <span className="text-gray-600">Legacy: {stats.legacy}</span>
          </div>
          <div className="mt-2">
            <Link 
              href="/admin/pins/debug"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              View raw JSON data
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Debug section - only visible to administrators */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">Debug Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Total Submissions: {submissions.length}</p>
            <ul className="mt-1 space-y-1 text-gray-600">
              <li>Pending: {submissions.filter(sub => sub.status === 'pending').length}</li>
              <li>Approved: {submissions.filter(sub => sub.status === 'approved').length}</li>
              <li>Rejected: {submissions.filter(sub => sub.status === 'rejected').length}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700">Current Filters:</p>
            <ul className="mt-1 space-y-1 text-gray-600">
              <li>Status: {activeTab}</li>
              <li>Request Type: {requestTypeFilter}</li>
              <li>Search: {searchQuery || 'None'}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700">Actions:</p>
            <button
              onClick={fetchSubmissions}
              className="mt-1 text-blue-600 hover:text-blue-800 underline"
            >
              Refresh Submissions Data
            </button>
            <Link
              href="/admin/pins/debug"
              className="mt-1 block text-blue-600 hover:text-blue-800 underline"
            >
              View Raw JSON Data
            </Link>
          </div>
        </div>
        
        {/* Raw submissions data for debugging */}
        <div className="mt-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              View Raw Submissions Data (total: {submissions.length})
            </summary>
            <div className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40 text-xs">
              <pre>{JSON.stringify(submissions, null, 2)}</pre>
            </div>
          </details>
        </div>
      </div>

      {/* Filters and tabs */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green"
            />
          </div>
          
          {/* Request type filter */}
          <div className="w-full md:w-1/3">
            <select
              value={requestTypeFilter}
              onChange={e => setRequestTypeFilter(e.target.value as 'all' | 'addition' | 'deletion')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green"
            >
              <option value="all">All Request Types</option>
              <option value="addition">Additions Only</option>
              <option value="deletion">Deletions Only</option>
            </select>
          </div>
        </div>
        
        {/* Status tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending
              <span className="ml-2 py-0.5 px-2 text-xs rounded-full bg-yellow-100 text-yellow-800">
                {submissions.filter(sub => sub.status === 'pending').length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved
              <span className="ml-2 py-0.5 px-2 text-xs rounded-full bg-green-100 text-green-800">
                {submissions.filter(sub => sub.status === 'approved').length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected
              <span className="ml-2 py-0.5 px-2 text-xs rounded-full bg-red-100 text-red-800">
                {submissions.filter(sub => sub.status === 'rejected').length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Submissions table - now full width */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green"></div>
          <p className="mt-2 text-gray-600">Loading submissions...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : searchFilteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 text-center text-gray-500">
            <p>
              {submissions.length === 0
                ? 'No submissions found. Users can submit new pins from the map.'
                : `No ${activeTab} submissions match your filters.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                {activeTab === 'pending' && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {searchFilteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{submission.name}</div>
                    <div className="text-sm text-gray-500">{submission.coordinates.join(', ')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getCategoryName(submission.categoryId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{submission.submitterName}</div>
                    <div className="text-sm text-gray-500">{submission.submitterEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(submission.submittedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      submission.requestType === 'addition' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {submission.requestType === 'addition' ? 'Addition' : 'Deletion'}
                    </span>
                  </td>
                  {activeTab === 'pending' && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleApprove(submission.id!)}
                        disabled={processingId === submission.id}
                        className="mr-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === submission.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(submission.id!)}
                        disabled={processingId === submission.id}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === submission.id ? 'Processing...' : 'Reject'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageWrapper>
  );
} 