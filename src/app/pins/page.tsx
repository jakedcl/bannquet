'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pin } from '@/components/projects/adk-map/types';
import { categories } from '@/components/projects/adk-map/MarkerStyle';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'type' | 'elevation' | 'status';

// Define pin types for filtering
const pinTypes = ['High Peak', 'Low Peak', 'Campsite', 'Lean-to', 'Lake', 'Pond', 'Waterfall', 'Parking', 'Other'];

// Extend the Pin type to include categoryId and status which are added dynamically
interface PinWithCategory extends Pin {
  categoryId?: string;
  status?: 'approved' | 'pending' | 'rejected';
}

export default function PinsPage() {
  const [pins, setPins] = useState<PinWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPin, setSelectedPin] = useState<PinWithCategory | null>(null);
  const [userSession, setUserSession] = useState<{
    name: string;
    email: string;
    isAdmin: boolean;
    isLoggedIn: boolean;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Check user is logged in
  useEffect(() => {
    // Get user session
    const savedSession = localStorage.getItem('adkMapUserSession');
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setUserSession(session);
      } catch (err) {
        console.error('Error parsing user session:', err);
        window.location.href = '/adkmap';
      }
    } else {
      // No session, redirect to map
      window.location.href = '/adkmap';
    }
  }, []);
  
  // Load pins when component mounts
  useEffect(() => {
    fetchPins();
  }, []);
  
  // Fetch all pins from all categories
  const fetchPins = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allPins: PinWithCategory[] = [];
      
      await Promise.all(categories.map(async (category) => {
        try {
          const response = await fetch(`/api/adk/${category.id}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ${category.name} pins`);
          }
          
          const data = await response.json();
          // Add category name to each pin for easier display
          const pinsWithCategory = data.data && data.data.pins ? data.data.pins.map((pin: Pin) => ({
            ...pin,
            categoryId: category.id,
            // Ensure each pin has an ID, generate one if missing
            id: pin.id || `${category.id}-${Math.random().toString(36).substring(2, 9)}`
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

  // Handle deleting a pin (for admin users)
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
  
  // Set a selected pin for editing (when Edit button is clicked)
  const handleEdit = (item: PinWithCategory) => {
    console.log("Selected pin for editing:", item);
    
    // Ensure the pin has an ID before proceeding
    if (!item.id) {
      console.error("Cannot edit a pin without an ID");
      alert("Error: This pin has no ID and cannot be edited.");
      return;
    }
    
    // Determine the category ID based on the pin type
    const derivedCategoryId = 
      item.type === 'High Peak' ? 'highpeaks' : 
      item.type === 'Low Peak' ? 'lowpeaks' : 
      item.type === 'Primitive Sites' ? 'primitivesites' :
      item.type === 'Lean-to' ? 'leantos' :
      item.type === 'Parking' ? 'parking' :
      item.type === 'Viewpoints' ? 'viewpoints' :
      item.type === 'Stay' ? 'stay' :
      item.type === 'Food' ? 'food' :
      item.type === 'Canoe Launch' ? 'canoe' :
      item.type === 'Waterfalls' ? 'waterfalls' :
      'other';
    
    // Create a pinToEdit object with the correct structure including ID
    const pinToEdit: PinWithCategory = {
      ...item,
      id: item.id, // Ensure ID is included
      categoryId: item.categoryId || derivedCategoryId
    };
    
    console.log("Prepared pin for editing:", pinToEdit);
    setSelectedPin(pinToEdit);
  };

  // Handle saving edits
  const handleSaveEdit = async (editedPin: PinWithCategory) => {
    try {
      console.log("Starting save edit process for pin:", editedPin);
      
      // Get session for auth
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (!savedSession) {
        throw new Error('No user session found');
      }
      
      const session = JSON.parse(savedSession);
      
      // Determine the category ID for the pin
      const categoryId = (
        editedPin.type === 'High Peak' ? 'highpeaks' :
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
      
      console.log("Determined categoryId:", categoryId, "Pin ID:", editedPin.id);
      
      // Check if the pin has an ID (existing pin)
      if (!editedPin.id) {
        console.error("Missing pin ID for edit operation");
        alert("Cannot edit a pin without an ID. This appears to be a new pin which should be created through the submission process.");
        return;
      }
      
      const pinData = {
        ...editedPin,
        categoryId
      };
      
      console.log("Sending pin data to API:", JSON.stringify(pinData, null, 2));
      
      // Always use PUT for editing existing pins in the directory
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
          categoryId: categoryId
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
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
      toast.textContent = `Pin "${editedPin.name}" has been updated successfully.`;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      // Update local state with the edited pin
      setPins(pins.map(p => p.id === editedPin.id ? editedPin : p));
      
      // Close edit modal
      setSelectedPin(null);
    } catch (error) {
      console.error('Error saving pin:', error);
      
      // Provide a more detailed error message
      if (error instanceof Error) {
        alert(`Failed to update pin: ${error.message}`);
      } else {
        alert('Failed to update pin. Please try again.');
      }
    }
  };
  
  // Regular users should only see approved pins
  const filteredPins = pins.filter(pin => {
    // For regular users, only show pins with approved status or no status (legacy pins)
    if (!userSession?.isAdmin) {
      return !pin.status || pin.status === 'approved';
    }
    
    // For admins, apply status filter if selected
    if (statusFilter !== 'all') {
      return pin.status === statusFilter;
    }
    
    // Admin with 'all' filter can see everything
    return true;
  });
  
  // Sort items based on current sort field and direction
  const sortedItems = [...filteredPins].sort((a, b) => {
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
    } else if (sortField === 'status') {
      // Add status sorting - fallback to empty string if status is undefined
      const statusA = a.status || '';
      const statusB = b.status || '';
      return sortDirection === 'asc'
        ? statusA.localeCompare(statusB)
        : statusB.localeCompare(statusA);
    }
    return 0;
  });
  
  // Filter items by type and search query
  const filteredItems = sortedItems.filter(item => {
    // Type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }
    
    // Search query filter
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query))
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
  
  // Function to handle "Add Location" button click
  const handleAddNewLocation = () => {
    window.location.href = '/adkmap';
    
    // After navigation, we'll show the Add Location modal
    localStorage.setItem('showAddLocationModal', 'true');
  };
  
  // Only show pins if user is logged in
  useEffect(() => {
    if (userSession) {
      // User is logged in, we can display pins
      console.log(`User ${userSession.name} is viewing the Pin Directory`);
    }
  }, [userSession]);
  
  // Monitor changes to selectedPin to help debug
  useEffect(() => {
    if (selectedPin) {
      console.log("selectedPin changed:", selectedPin);
    }
  }, [selectedPin]);

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with pin:", selectedPin);
    
    if (!selectedPin) {
      console.error("No pin selected for edit");
      return;
    }
    
    if (!selectedPin.id) {
      console.error("Cannot edit a pin without an ID");
      alert("Error: This pin has no ID and cannot be edited.");
      return;
    }
    
    // Ensure coordinates are correctly formatted
    if (!selectedPin.coordinates || !Array.isArray(selectedPin.coordinates) || selectedPin.coordinates.length !== 2) {
      console.error("Invalid coordinates format:", selectedPin.coordinates);
      alert("Error: Pin coordinates are invalid.");
      return;
    }
    
    handleSaveEdit(selectedPin);
  };

  return (
    <AdminPageWrapper title="Pin Directory">
      {/* 
        This page shows the pin directory for regular users.
        It only displays approved pins and does not include edit/delete functionality.
        For admin functionality, see /admin/pins page.
      */}
      
      {/* Back to Map and Add Location buttons */}
      <div className="flex justify-between mb-6">
        <Link href="/adkmap" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Map
        </Link>
        <button
          onClick={handleAddNewLocation}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-green rounded-md border border-transparent hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Location
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Filter and Search Controls */}
        <div className="flex flex-wrap gap-3 items-center mb-4 bg-gray-50 p-3 rounded-lg">
          {/* Search - Now first/left element */}
          <div className="flex items-center">
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
          
          {/* Spacer */}
          <div className="flex-grow"></div>
          
          {/* Type Filter - Now right element */}
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
          
          {/* Status Filter - Only for admins, now rightmost element */}
          {userSession?.isAdmin && (
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
          )}
        </div>

        {loading ? (
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
                      Coordinates
                    </th>
                    {/* Add Status column for Admin users */}
                    {userSession?.isAdmin && (
                      <th 
                        scope="col" 
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {sortField === 'status' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    )}
                    {/* Add Actions column for Admin users */}
                    {userSession?.isAdmin && (
                      <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={userSession?.isAdmin ? 6 : 4} className="px-3 py-3 text-center text-gray-500">
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
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {item.coordinates.join(', ')}
                        </td>
                        {/* Add Status column for Admin users */}
                        {userSession?.isAdmin && (
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {!item.status && <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">Legacy</span>}
                            {item.status === 'approved' && <span className="px-2 py-1 text-xs rounded-full bg-green-200 text-green-800">Approved</span>}
                            {item.status === 'pending' && <span className="px-2 py-1 text-xs rounded-full bg-yellow-200 text-yellow-800">Pending</span>}
                            {item.status === 'rejected' && <span className="px-2 py-1 text-xs rounded-full bg-red-200 text-red-800">Rejected</span>}
                          </td>
                        )}
                        {/* Add Edit and Delete buttons for Admin users */}
                        {userSession?.isAdmin && (
                          <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
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
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Pin Modal - For admin users */}
      {selectedPin && userSession?.isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedPin.id ? 'Edit Pin' : 'Add New Pin'}</h2>
                <button 
                  onClick={() => setSelectedPin(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      value={selectedPin.name}
                      onChange={(e) => setSelectedPin({...selectedPin, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      id="edit-type"
                      value={selectedPin.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        // Determine new categoryId based on the selected type
                        const newCategoryId = 
                          newType === 'High Peak' ? 'highpeaks' : 
                          newType === 'Low Peak' ? 'lowpeaks' : 
                          newType === 'Primitive Sites' ? 'primitivesites' :
                          newType === 'Lean-to' ? 'leantos' :
                          newType === 'Parking' ? 'parking' :
                          newType === 'Viewpoints' ? 'viewpoints' :
                          newType === 'Stay' ? 'stay' :
                          newType === 'Food' ? 'food' :
                          newType === 'Canoe Launch' ? 'canoe' :
                          newType === 'Waterfalls' ? 'waterfalls' :
                          'other';
                        
                        console.log(`Type changed from ${selectedPin.type} to ${newType}, updating categoryId from ${selectedPin.categoryId} to ${newCategoryId}`);
                        
                        // Update both type and categoryId
                        setSelectedPin({
                          ...selectedPin, 
                          type: newType,
                          categoryId: newCategoryId
                        });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                      required
                    >
                      {pinTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Elevation */}
                  <div>
                    <label htmlFor="edit-elevation" className="block text-sm font-medium text-gray-700">Elevation (ft)</label>
                    <input
                      type="text"
                      id="edit-elevation"
                      value={selectedPin.elevation || ''}
                      onChange={(e) => setSelectedPin({...selectedPin, elevation: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                      placeholder="Optional"
                    />
                  </div>

                  {/* Coordinates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-lat" className="block text-sm font-medium text-gray-700">Latitude</label>
                      <input
                        type="number"
                        id="edit-lat"
                        value={selectedPin.coordinates[1]}
                        onChange={(e) => {
                          const newCoords = [...selectedPin.coordinates];
                          newCoords[1] = parseFloat(e.target.value);
                          setSelectedPin({...selectedPin, coordinates: newCoords as [number, number]});
                        }}
                        step="0.000001"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-lng" className="block text-sm font-medium text-gray-700">Longitude</label>
                      <input
                        type="number"
                        id="edit-lng"
                        value={selectedPin.coordinates[0]}
                        onChange={(e) => {
                          const newCoords = [...selectedPin.coordinates];
                          newCoords[0] = parseFloat(e.target.value);
                          setSelectedPin({...selectedPin, coordinates: newCoords as [number, number]});
                        }}
                        step="0.000001"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="edit-description"
                      value={selectedPin.description || ''}
                      onChange={(e) => setSelectedPin({...selectedPin, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-green hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
                  >
                    Save
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