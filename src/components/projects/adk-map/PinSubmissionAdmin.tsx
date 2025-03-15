'use client';

import { useState, useEffect } from 'react';
import { PinSubmission } from './types';
import { categories } from './MarkerStyle';
import { motion, AnimatePresence } from 'framer-motion';

interface PinSubmissionAdminProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export default function PinSubmissionAdmin({ 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: PinSubmissionAdminProps) {
  const [submissions, setSubmissions] = useState<PinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'addition' | 'deletion'>('all');

  // Fetch submissions when the component is opened
  useEffect(() => {
    if (isOpen) {
      fetchSubmissions();
    }
  }, [isOpen]);

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
    } catch (err) {
      setError('Error loading submissions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions when filter changes
  useEffect(() => {
    if (isOpen) {
      fetchSubmissions();
    }
  }, [requestTypeFilter, isOpen]);

  // Handle approve submission
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    
    try {
      await onApprove(id);
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
    setProcessingId(id);
    
    try {
      await onReject(id);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Manage Location Submissions</h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex px-6">
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
            <div className="p-4 bg-gray-50 border-b border-gray-200">
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

            <div className="flex-1 overflow-y-auto p-6">
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
                          
                          {/* Show details on click/expand */}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 