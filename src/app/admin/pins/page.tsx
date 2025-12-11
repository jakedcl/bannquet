'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pin, PinSubmission } from '@/components/adk-map/types';
import { categories } from '@/components/adk-map/MarkerStyle';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'type' | 'elevation' | 'submitter';

// Define pin types for filtering
const pinTypes = ['High Peak', 'Low Peak', 'Campsite', 'Lean-to', 'Lake', 'Pond', 'Waterfall', 'Parking', 'Other'];

// Extend the Pin type to include categoryId which is added dynamically when fetching pins
interface PinWithCategory extends Pin {
  categoryId?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'legacy';
}

export default function AdminPinsPage() {
  const [pins, setPins] = useState<PinWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPin, setSelectedPin] = useState<PinWithCategory | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [submissions, setSubmissions] = useState<PinWithCategory[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
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
  
  // Load pins when component mounts
  useEffect(() => {
    fetchPins();
    fetchSubmissions();
  }, []);
  
  // Fetch all pins from all categories
  const fetchPins = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      const allPins: PinWithCategory[] = [];
      
      await Promise.all(categories.map(async (category) => {
        try {
          const response = await fetch(`/api/adk/${category.id}`, {
            headers: {
              'Authorization': `Bearer ${session.email}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ${category.name} pins`);
          }
          
          const data = await response.json();
          // Add category name to each pin for easier display
          const pinsWithCategory = data.data && data.data.pins ? data.data.pins.map((pin: Pin) => ({
            ...pin,
            categoryId: category.id,
            status: 'approved' // Default status for existing pins
          })) : [];
          
          allPins.push(...pinsWithCategory);
        } catch (err) {
          console.error(`Error fetching ${category.name} pins:`, err);
        }
      }));
      
      setPins(allPins);
    } catch (err) {
      setError('Failed to load pins. Please refresh the page.');
      console.error('Error fetching pins:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch pending submissions
  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    
    try {
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      const response = await fetch('/api/map-submissions', {
        headers: {
          'Authorization': `Bearer ${session.email}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      
      // Format submissions as pins and add status
      const submissionPins = data.submissions && data.submissions.length > 0 
        ? data.submissions.map((sub: PinSubmission) => ({
            id: sub.id,
            name: sub.name,
            coordinates: sub.coordinates,
            elevation: sub.elevation,
            type: sub.categoryId.replace(/([A-Z])/g, ' $1').trim(), // Format category ID to readable type
            source: 'user-submitted',
            description: sub.description,
            submitterName: sub.submitterName,
            submitterEmail: sub.submitterEmail,
            categoryId: sub.categoryId,
            status: sub.status
          }))
        : [];
      
      setSubmissions(submissionPins);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };
  
  // Handle deleting a pin
  const handleDelete = async (pin: PinWithCategory) => {
    if (confirm(`Are you sure you want to permanently delete "${pin.name}"? This action cannot be undone.`)) {
      try {
        // Get session for auth
        const savedSession = localStorage.getItem('adkMapUserSession');
        if (!savedSession) {
          throw new Error('No user session found');
        }
        
        const session = JSON.parse(savedSession);
        
        // Extract the pin category
        const categoryId = pin.type === 'High Peak' ? 'highpeaks' : 
                          pin.type === 'Low Peak' ? 'lowpeaks' : pin.categoryId || 'other';
                          
        const response = await fetch('/api/admin/pins', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.email}`
          },
          body: JSON.stringify({
            pinId: pin.id,
            categoryId: categoryId,
            coordinates: pin.coordinates
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete pin');
        }
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
        toast.textContent = `Pin "${pin.name}" has been permanently deleted.`;
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 3000);
        
        // Remove pin from local state
        setPins(pins.filter(p => p.id !== pin.id));
      } catch (error) {
        console.error('Error deleting pin:', error);
        alert('Failed to delete pin. Please try again.');
      }
    }
  };
  
  // Handle saving edits to a pin
  const handleSaveEdit = async (editedPin: PinWithCategory) => {
    try {
      console.log("Editing pin:", editedPin);
      
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      // Determine the category ID for the pin
      const categoryId = (
        editedPin.type === 'High Peak' || editedPin.type === 'peaks' ? 'highpeaks' :
        editedPin.type === 'Low Peak' ? 'lowpeaks' :
        editedPin.type === 'Primitive Sites' ? 'primitivesites' :
        editedPin.type === 'Lean-to' ? 'leantos' :
        editedPin.type === 'Parking' ? 'parking' :
        editedPin.type === 'Viewpoints' ? 'viewpoints' :
        editedPin.type === 'Stay' ? 'stay' :
        editedPin.type === 'Food' ? 'food' :
        editedPin.type === 'Canoe Launch' ? 'canoe' :
        editedPin.type === 'Waterfalls' ? 'waterfalls' :
        'other');
      
      console.log("Determined categoryId:", categoryId);
      console.log("Pin ID:", editedPin.id);
      console.log("Pin status:", editedPin.status);
      
      // Check if the pin has an ID (existing pin)
      if (!editedPin.id) {
        console.error("Cannot edit a pin without an ID");
        alert("Error: This pin has no ID and cannot be edited.");
        return;
      }
      
      // Check if this is a legacy pin (from original dataset without an ID)
      const isLegacyPin = editedPin.status === 'legacy' || (editedPin.id && editedPin.id.startsWith('legacy-'));
      console.log("Is legacy pin:", isLegacyPin);
      
      const pinData = {
        ...editedPin,
        categoryId,
        // If it's a legacy pin being edited, make sure it's marked as approved after edit
        status: isLegacyPin ? 'approved' : editedPin.status
      };
      
      console.log("Sending pin data to API:", JSON.stringify(pinData, null, 2));
      
      // Update the pin via API
      const response = await fetch('/api/admin/pins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.email}`
        },
        body: JSON.stringify({
          pin: {
            ...pinData,
            id: editedPin.id // Ensure the ID is explicitly included
          },
          categoryId: categoryId,
          isLegacyPin: isLegacyPin // Send flag to API to handle legacy pins differently if needed
        }),
      });
      
      // Get the response text first before trying to parse it
      const responseText = await response.text();
      console.log("API Response Text:", responseText);
      
      // Try to parse the response as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("API Response Data:", responseData);
      } catch (jsonError) {
        console.warn("Could not parse response as JSON:", jsonError);
      }
      
      if (!response.ok) {
        console.error("API Error Details:", {
          status: response.status,
          statusText: response.statusText,
          responseText,
          responseData
        });
        throw new Error(`Failed to update pin: ${response.status} ${response.statusText}`);
      }
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg';
      toast.textContent = `Pin "${editedPin.name}" has been updated successfully.`;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      // Update pin in local state
      setPins(pins.map(p => p.id === editedPin.id ? editedPin : p));
      
      // Close modal
      setSelectedPin(null);
    } catch (error) {
      console.error('Error saving pin:', error);
      alert('Failed to save pin changes: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle approving a submission
  const handleApproveSubmission = async (submission: PinWithCategory) => {
    try {
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      const response = await fetch(`/api/map-submissions?id=${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.email}`
        },
        body: JSON.stringify({
          status: 'approved'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve submission');
      }
      
      // Update local state
      setSubmissions(submissions.map(s => 
        s.id === submission.id ? {...s, status: 'approved'} : s
      ));
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
      toast.textContent = `Submission "${submission.name}" has been approved.`;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Failed to approve submission. Please try again.');
    }
  };

  // Handle rejecting a submission
  const handleRejectSubmission = async (submission: PinWithCategory) => {
    try {
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      const response = await fetch(`/api/map-submissions?id=${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.email}`
        },
        body: JSON.stringify({
          status: 'rejected'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject submission');
      }
      
      // Update local state
      setSubmissions(submissions.map(s => 
        s.id === submission.id ? {...s, status: 'rejected'} : s
      ));
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
      toast.textContent = `Submission "${submission.name}" has been rejected.`;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert('Failed to reject submission. Please try again.');
    }
  };
  
  // Combine pins and submissions for display
  const allItems = [...pins, ...submissions];
  
  // Sort items based on current sort field and direction
  const sortedItems = [...allItems].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortField === 'type') {
      return sortDirection === 'asc'
        ? a.type.localeCompare(b.type)
        : b.type.localeCompare(a.type);
    } else if (sortField === 'elevation') {
      const elevA = a.elevation ? parseFloat(a.elevation) : 0;
      const elevB = b.elevation ? parseFloat(b.elevation) : 0;
      return sortDirection === 'asc' ? elevA - elevB : elevB - elevA;
    } else if (sortField === 'submitter') {
      const submitterA = a.submitterName || '';
      const submitterB = b.submitterName || '';
      return sortDirection === 'asc'
        ? submitterA.localeCompare(submitterB)
        : submitterB.localeCompare(submitterA);
    }
    return 0;
  });
  
  // Filter items by type, status, and search query
  const filteredItems = sortedItems.filter(item => {
    // Type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    
    // Search query filter
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.submitterName && item.submitterName.toLowerCase().includes(query))
      );
    }
    
    return true;
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

  // Function to navigate to the map with "add pin" mode
  const handleAddNewPin = () => {
    // Create a new empty pin and open the edit modal
    const newPin: PinWithCategory = {
      name: 'New Pin',
      coordinates: [-74.0, 44.1], // Center of Adirondacks region
      type: 'Other',
      source: 'admin',
      status: 'approved'
    };
    
    setSelectedPin(newPin);
  };
  
  // Handle edit button click - prepare the pin for editing
  const handleEdit = (item: PinWithCategory) => {
    console.log("Editing pin:", item);
    
    // Determine category ID based on pin type if not already present
    const derivedCategoryId = (
      item.type === 'High Peak' || item.type === 'peaks' ? 'highpeaks' :
      item.type === 'Low Peak' ? 'lowpeaks' :
      item.type === 'Primitive Sites' ? 'primitivesites' :
      item.type === 'Lean-to' ? 'leantos' :
      item.type === 'Parking' ? 'parking' :
      item.type === 'Viewpoints' ? 'viewpoints' :
      item.type === 'Stay' ? 'stay' :
      item.type === 'Food' ? 'food' :
      item.type === 'Canoe Launch' ? 'canoe' :
      item.type === 'Waterfalls' ? 'waterfalls' :
      'other');
    
    // Create a pinToEdit object with the correct structure including ID
    const pinToEdit: PinWithCategory = {
      ...item,
      // For legacy pins that don't have an ID, create a temporary one based on name and coordinates
      id: item.id || `legacy-${item.name.replace(/\s+/g, '-').toLowerCase()}-${item.coordinates[0]}-${item.coordinates[1]}`,
      categoryId: item.categoryId || derivedCategoryId,
      // Mark as legacy pin if it doesn't have an ID
      status: item.id ? (item.status || 'approved') : 'legacy'
    };
    
    console.log("Prepared pin for editing:", pinToEdit);
    setSelectedPin(pinToEdit);
  };
  
  return (
    <AdminPageWrapper title="Pin Directory (Admin)">
      {/* Controls */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Back to Map and Add New Pin buttons */}
          <div className="flex justify-between mb-6">
            <Link href="/map" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Map
            </Link>
            
            <div className="flex space-x-3">
              <Link
                href="/admin/submissions"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md border border-transparent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Submissions
              </Link>
              
              <button
                onClick={handleAddNewPin}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-green rounded-md border border-transparent hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Pin
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center mb-4 bg-gray-50 p-3 rounded-lg">
            {/* Type Filter */}
            <div className="flex items-center">
              <label htmlFor="type-filter" className="text-sm font-medium text-gray-700 mr-2">Type:</label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
              >
                <option value="all">All Types</option>
                {pinTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mr-2">Status:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            {/* Search */}
            <div className="flex items-center ml-auto">
              <label htmlFor="search-pins" className="text-sm font-medium text-gray-700 mr-2">Search:</label>
              <input
                id="search-pins"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pins..."
                className="block rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {loading || loadingSubmissions ? (
        <div className="bg-white p-4 rounded-md shadow-sm text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading pins...</p>
        </div>
      ) : error ? (
        <div className="bg-white p-4 rounded-md shadow-sm text-center text-red-500">
          {error}
        </div>
      ) : (
        <div className="bg-white overflow-hidden rounded-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {sortField === 'name' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {sortField === 'type' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('elevation')}
                  >
                    <div className="flex items-center">
                      Elevation
                      {sortField === 'elevation' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-gray-500">
                      No pins match your filters. Try adjusting your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr key={`${item.id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {item.type}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {item.elevation ? `${item.elevation} ft` : 'N/A'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          item.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status || 'approved'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                        {/* For regular pins or approved submissions */}
                        {(!item.status || item.status === 'approved') && (
                          <>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        
                        {/* For pending submissions */}
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveSubmission(item)}
                              className="text-green-600 hover:text-green-900 mr-3"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectSubmission(item)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {/* For rejected submissions - allow reconsideration */}
                        {item.status === 'rejected' && (
                          <>
                            <button
                              onClick={() => handleApproveSubmission(item)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Reconsider
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Edit Modal */}
      {selectedPin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Edit Pin</h3>
              <button 
                onClick={() => setSelectedPin(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form className="space-y-4" onSubmit={(event) => {
                event.preventDefault();
                if (selectedPin) {
                  handleSaveEdit(selectedPin);
                }
              }}>
                <div>
                  <label htmlFor="pin-name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input 
                    type="text"
                    id="pin-name"
                    value={selectedPin.name}
                    onChange={(e) => setSelectedPin({...selectedPin, name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="pin-type" className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    id="pin-type"
                    value={selectedPin.type}
                    onChange={(e) => setSelectedPin({...selectedPin, type: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                    required
                  >
                    {pinTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="pin-elevation" className="block text-sm font-medium text-gray-700">Elevation (ft)</label>
                  <input 
                    type="text"
                    id="pin-elevation"
                    value={selectedPin.elevation || ''}
                    onChange={(e) => setSelectedPin({...selectedPin, elevation: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="pin-coordinates" className="block text-sm font-medium text-gray-700">Coordinates (lat, lng)</label>
                  <input 
                    type="text"
                    id="pin-coordinates"
                    value={selectedPin.coordinates.join(', ')}
                    onChange={(e) => {
                      const parts = e.target.value.split(',').map(p => parseFloat(p.trim()));
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        setSelectedPin({...selectedPin, coordinates: [parts[0], parts[1]]});
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="pin-description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="pin-description"
                    rows={3}
                    value={selectedPin.description || ''}
                    onChange={(e) => setSelectedPin({...selectedPin, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-green hover:bg-brand-green-light"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
} 