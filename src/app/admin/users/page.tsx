'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, PinSubmission } from '@/components/adk-map/types';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'email' | 'pinnedPins' | 'createdAt';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<{
    pending: PinSubmission[];
    approved: PinSubmission[];
    rejected: PinSubmission[];
  }>({
    pending: [],
    approved: [],
    rejected: []
  });
  
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
    
    fetchUsers();
  }, []);
  
  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the user session for admin auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      // Make the request with session data in headers
      const response = await fetch('/api/admin/users', {
        headers: {
          'Content-Type': 'application/json',
          // Add auth header with session info
          'Authorization': `Bearer ${session.email}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError('Failed to load users. Please refresh the page.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch submissions for a specific user
  const fetchUserSubmissions = async (userId: string, email: string) => {
    try {
      // In a real app, this would be a dedicated API endpoint
      // For this example, we'll filter submissions by email
      const response = await fetch('/api/map-submissions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      
      // Group submissions by status
      const userSubs = data.submissions.filter((sub: PinSubmission) => sub.submitterEmail === email);
      
      const grouped = {
        pending: userSubs.filter((sub: PinSubmission) => sub.status === 'pending'),
        approved: userSubs.filter((sub: PinSubmission) => sub.status === 'approved'),
        rejected: userSubs.filter((sub: PinSubmission) => sub.status === 'rejected')
      };
      
      setUserSubmissions(grouped);
    } catch (err) {
      console.error('Error fetching user submissions:', err);
    }
  };
  
  // Handle selecting a user to view details
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    fetchUserSubmissions(user.id || '', user.email);
  };
  
  // Sort users based on sort field and direction
  const sortedUsers = [...users].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    } else if (sortField === 'email') {
      return sortDirection === 'asc'
        ? a.email.localeCompare(b.email)
        : b.email.localeCompare(a.email);
    } else if (sortField === 'pinnedPins') {
      const aCount = a.pinnedPins || 0;
      const bCount = b.pinnedPins || 0;
      return sortDirection === 'asc' ? aCount - bCount : bCount - aCount;
    } else if (sortField === 'createdAt') {
      return sortDirection === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });
  
  // Filter users by search query
  const filteredUsers = sortedUsers.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });
  
  // Toggle sort direction when clicking the same field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <AdminPageWrapper title="User Management">
      {/* Back to map button */}
      <div className="mb-6 flex justify-end">
        <Link href="/map" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Map
        </Link>
      </div>

      {/* Search control */}
      <div className="bg-gray-50 p-3 rounded-lg mb-6 flex justify-end">
        <div className="flex items-center">
          <label htmlFor="search-users" className="text-sm font-medium text-gray-700 mr-2">Search:</label>
          <input
            id="search-users"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
          />
        </div>
      </div>

      {/* User data display */}
      <div className="flex flex-col gap-4">
        {/* Users list - full width now */}
        <div className="w-full bg-white rounded-md shadow-sm overflow-hidden">
          <div className="px-3 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-base font-medium text-gray-700">Users ({filteredUsers.length})</h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {sortField === 'name' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Email
                        {sortField === 'email' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-24"
                      onClick={() => handleSort('pinnedPins')}
                    >
                      <div className="flex items-center justify-center">
                        Pins
                        {sortField === 'pinnedPins' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedUser?.id === user.id ? 'bg-blue-50' : ''}`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                            {user.isAdmin && (
                              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 truncate max-w-[150px]">
                        {user.email}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 text-center">
                        {user.pinnedPins || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User details panel - more compact */}
        <div className="lg:w-3/5 bg-white rounded-md shadow-sm overflow-hidden">
          {selectedUser ? (
            <div>
              <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{selectedUser.name}&apos;s Profile</h3>
                <p className="mt-1 text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              
              <div className="p-4">
                <div className="space-y-6">
                  {/* User info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Account Information</h4>
                      <div className="bg-gray-50 rounded-md p-3 space-y-2">
                        <div>
                          <span className="text-xs text-gray-500">Account Type:</span>
                          <p className="font-medium">{selectedUser.isAdmin ? 'Administrator' : 'Regular User'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Created On:</span>
                          <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Pin Count:</span>
                          <p className="font-medium">{selectedUser.pinnedPins || 0} pins</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Submission Stats</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-yellow-50 rounded-md p-3">
                          <span className="text-xs text-yellow-600">Pending</span>
                          <p className="text-xl font-bold text-yellow-700">{userSubmissions.pending.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-md p-3">
                          <span className="text-xs text-green-600">Approved</span>
                          <p className="text-xl font-bold text-green-700">{userSubmissions.approved.length}</p>
                        </div>
                        <div className="bg-red-50 rounded-md p-3">
                          <span className="text-xs text-red-600">Rejected</span>
                          <p className="text-xl font-bold text-red-700">{userSubmissions.rejected.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Submission tabs */}
                  <div>
                    <div className="border-b border-gray-200">
                      <nav className="-mb-px flex">
                        <button className="border-brand-green text-brand-green font-medium border-b-2 py-2 px-4 text-sm focus:outline-none">
                          Submissions
                        </button>
                      </nav>
                    </div>
                    
                    <div className="mt-4">
                      {userSubmissions.pending.length === 0 && 
                        userSubmissions.approved.length === 0 && 
                        userSubmissions.rejected.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          This user hasn&apos;t submitted any pins yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Pending submissions */}
                          {userSubmissions.pending.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-yellow-600 mb-2">Pending Submissions</h5>
                              <div className="bg-white rounded-md border border-gray-200 divide-y divide-gray-200 max-h-[200px] overflow-y-auto">
                                {userSubmissions.pending.map(sub => (
                                  <div key={sub.id} className="p-3 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-gray-900">{sub.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {sub.categoryId.replace(/([A-Z])/g, ' $1').trim()} • Submitted on {new Date(sub.submittedAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div className="flex space-x-2">
                                        <button className="text-xs text-green-600 hover:text-green-800">Approve</button>
                                        <button className="text-xs text-red-600 hover:text-red-800">Reject</button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Approved submissions */}
                          {userSubmissions.approved.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-green-600 mb-2">Approved Submissions</h5>
                              <div className="bg-white rounded-md border border-gray-200 divide-y divide-gray-200 max-h-[200px] overflow-y-auto">
                                {userSubmissions.approved.map(sub => (
                                  <div key={sub.id} className="p-3 hover:bg-gray-50">
                                    <p className="font-medium text-gray-900">{sub.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {sub.categoryId.replace(/([A-Z])/g, ' $1').trim()} • Approved on {sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Rejected submissions */}
                          {userSubmissions.rejected.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-red-600 mb-2">Rejected Submissions</h5>
                              <div className="bg-white rounded-md border border-gray-200 divide-y divide-gray-200 max-h-[200px] overflow-y-auto">
                                {userSubmissions.rejected.map(sub => (
                                  <div key={sub.id} className="p-3 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium text-gray-900">{sub.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {sub.categoryId.replace(/([A-Z])/g, ' $1').trim()} • Rejected on {sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                      </div>
                                      <button className="text-xs text-blue-600 hover:text-blue-800">Reconsider</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-gray-50">
              <div className="flex items-center justify-center">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Select a user from the list to view details</p>
                  <p className="text-xs text-gray-400 mt-1">User information and submission history will appear here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
} 