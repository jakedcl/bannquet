'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Pin, PinData, VisibleCategories, UserSession } from './types';
import SearchBar from './SearchBar';
import MarkerStyle, { categories } from './MarkerStyle';

interface SidebarProps {
  pins: PinData;
  setSelectedPin: (pin: Pin | null) => void;
  flyToPin: (pin: Pin) => void;
  visibleCategories: VisibleCategories;
  setVisibleCategories: React.Dispatch<React.SetStateAction<VisibleCategories>>;
  selectedPin: Pin | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOpenSubmitForm: () => void;
  onOpenUserPinManager: () => void;
}

export default function Sidebar({
  pins,
  setSelectedPin,
  flyToPin,
  visibleCategories,
  setVisibleCategories,
  selectedPin,
  isOpen,
  onOpenChange,
  onOpenSubmitForm,
  onOpenUserPinManager
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  
  // Load user session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (savedSession) {
        try {
          setUserSession(JSON.parse(savedSession));
        } catch (err) {
          console.error('Error parsing user session:', err);
        }
      }
    }
  }, []);
  
  // Toggle all categories on/off
  const toggleAllCategories = (checked: boolean) => {
    const newState = { ...visibleCategories };
    categories.forEach(category => {
      newState[category.id] = checked;
    });
    setVisibleCategories(newState);
  };

  // Check if all categories are currently checked
  const areAllCategoriesSelected = () => {
    return categories.every(category => visibleCategories[category.id]);
  };

  // Check if we're on a mobile viewport
  const isMobileViewport = () => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  };

  // Function to handle button clicks on mobile
  const handleButtonClick = (callback: () => void) => {
    // If on mobile, collapse the sidebar first
    if (isMobileViewport()) {
      onOpenChange(false);
    }
    // Then execute the provided callback
    callback();
  };
  
  // Function to directly delete a pin (admin only)
  const handleAdminDeletePin = async (pin: Pin) => {
    if (confirm(`Are you sure you want to permanently delete "${pin.name}"? This action cannot be undone.`)) {
      try {
        // Extract the pin category
        const categoryId = pin.type === 'High Peak' ? 'highpeaks' : 
                          pin.type === 'Low Peak' ? 'lowpeaks' : 'other';
                          
        const response = await fetch('/api/admin/pins', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
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
        
        // Close details if showing this pin
        setSelectedPin(null);
        
        // Reload the page to refresh the data
        window.location.reload();
      } catch (error) {
        console.error('Error deleting pin:', error);
        alert('Failed to delete pin. Please try again.');
      }
    }
  };

  // Mobile peek handle when sidebar is closed
  if (!isOpen && isMobileViewport()) {
    return (
      <div 
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 cursor-pointer"
        onClick={() => onOpenChange(true)}
      >
        <div className="bg-gray-50/95 backdrop-blur-md rounded-r-lg shadow-md h-20 w-6 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`fixed z-20 bg-gray-50/95 backdrop-blur-md shadow-lg
          flex flex-col overflow-hidden
          
          /* Desktop Styles */
          md:top-[72px] md:left-0 md:h-[calc(100vh-72px)] md:w-[340px] md:rounded-r-lg
          ${isOpen ? 'md:translate-x-0' : 'md:translate-x-[-290px]'}
          
          /* Mobile Styles */
          max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-[65vh] max-md:rounded-t-xl
          ${isOpen ? 'max-md:translate-y-0' : 'max-md:translate-y-[100%]'}`}
        style={{
          transition: 'all 0.3s ease-in-out',
          transform: typeof window !== 'undefined' && window.innerWidth >= 768 
            ? (isOpen ? 'translateX(0)' : 'translateX(-290px)') 
            : (isOpen ? 'translateY(0)' : 'translateY(100%)')
        }}
      >
        {/* Close button for mobile */}
        <div className="md:hidden w-full flex justify-between items-center px-4 pt-3 pb-2 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">
            {selectedPin ? "Pin Details" : "Map Settings"}
          </h2>
          <button
            onClick={() => onOpenChange(false)} 
            className="rounded-full p-1.5 bg-gray-200 text-gray-600 hover:bg-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Desktop Title */}
        <div className="hidden md:block px-4 pt-4 pb-2">
          <h2 className="text-lg font-medium text-gray-800">
            {selectedPin ? "Pin Details" : "Map Settings"}
          </h2>
        </div>
        
        {/* Desktop Handle - Right column of sidebar */}
        <div 
          className="hidden md:block absolute top-0 right-0 w-[50px] h-full cursor-pointer bg-gray-50/95 backdrop-blur-md hover:bg-gray-200 transition-colors"
          onClick={() => onOpenChange(!isOpen)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Content Container */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto md:w-[290px]">
          {/* Search Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <SearchBar
              pins={pins}
              setSelectedPin={setSelectedPin}
              flyToPin={flyToPin}
            />
          </div>

          {/* Info Panel for selected pin */}
          {selectedPin && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <h4 className="text-lg font-medium">{selectedPin.name}</h4>
                
                {/* Three dots menu */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const menu = e.currentTarget.nextElementSibling;
                      menu?.classList.toggle('hidden');
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  <div className="hidden absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-30 border border-gray-200 overflow-hidden">
                    {/* Admin Delete Button - Only shown for admins */}
                    {userSession?.isAdmin && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleAdminDeletePin(selectedPin);
                          
                          // Close the dropdown menu
                          e.currentTarget.closest('.relative')?.querySelector('button')?.click();
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Pin
                      </button>
                    )}
                    
                    {/* Request Deletion Button - For non-admins */}
                    {!userSession?.isAdmin && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to request deletion of "${selectedPin.name}"?`)) {
                            try {
                              // Get user session if available
                              let submitterName = '';
                              let submitterEmail = '';
                              const savedSession = localStorage.getItem('adkMapUserSession');
                              
                              if (savedSession) {
                                try {
                                  const session = JSON.parse(savedSession);
                                  if (session.isLoggedIn) {
                                    submitterName = session.name;
                                    submitterEmail = session.email;
                                  }
                                } catch (err) {
                                  console.error('Error parsing user session:', err);
                                }
                              }
                              
                              // If no session, prompt for email
                              if (!submitterEmail) {
                                submitterEmail = prompt('Please enter your email to submit this deletion request:') || '';
                                if (!submitterEmail) {
                                  return; // User cancelled
                                }
                                
                                submitterName = prompt('Please enter your name:') || '';
                                if (!submitterName) {
                                  return; // User cancelled
                                }
                              }
                              
                              // Submit deletion request
                              const response = await fetch('/api/map-submissions', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  name: `Delete: ${selectedPin.name}`,
                                  coordinates: selectedPin.coordinates,
                                  categoryId: selectedPin.type === 'High Peak' ? 'highpeaks' : selectedPin.type === 'Low Peak' ? 'lowpeaks' : 'other',
                                  description: `Request to delete the pin "${selectedPin.name}" at coordinates ${selectedPin.coordinates.join(', ')}`,
                                  submitterName,
                                  submitterEmail,
                                  includeSubmitterName: false,
                                  includeSubmitterEmail: false,
                                  requestType: 'deletion',
                                  targetPinId: selectedPin.id || selectedPin.name // Use ID if available, otherwise name as identifier
                                }),
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to submit deletion request');
                              }
                              
                              // Show success message
                              const toast = document.createElement('div');
                              toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
                              toast.textContent = 'Deletion request has been sent to the administrators.';
                              document.body.appendChild(toast);
                              
                              // Remove toast after 3 seconds
                              setTimeout(() => {
                                document.body.removeChild(toast);
                              }, 3000);
                              
                              // Close the dropdown menu
                              e.currentTarget.closest('.relative')?.querySelector('button')?.click();
                            } catch (error) {
                              console.error('Error submitting deletion request:', error);
                              alert('Failed to submit deletion request. Please try again.');
                            }
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Request Deletion
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-sm">Class: {selectedPin.type}</p>
              {selectedPin.elevation && <p className="text-sm">Elevation: {selectedPin.elevation}ft</p>}
              <p className="text-sm">Coordinates: {selectedPin.coordinates.join(', ')}</p>
              
              {selectedPin.description && (
                <p className="text-sm mt-2 text-gray-700">{selectedPin.description}</p>
              )}
              
              {/* Submitter information if they've opted to include it */}
              {selectedPin.submitterName && selectedPin.includeSubmitterName && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Submitted by:</p>
                  <p className="text-sm">{selectedPin.submitterName}</p>
                  {selectedPin.submitterEmail && selectedPin.includeSubmitterEmail && (
                    <p className="text-sm text-gray-600">{selectedPin.submitterEmail}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Categories Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-2">Categories</div>
            
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 py-2 border-b border-gray-100 mb-2">
              <input
                type="checkbox"
                checked={areAllCategoriesSelected()}
                onChange={(e) => toggleAllCategories(e.target.checked)}
                className="cursor-pointer w-4 h-4 text-brand-green"
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All
              </label>
            </div>
            
            <div className="space-y-1">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id={`category-${category.id}`}
                    checked={visibleCategories[category.id]}
                    onChange={() => {
                      setVisibleCategories((prev: VisibleCategories) => ({
                        ...prev,
                        [category.id]: !prev[category.id]
                      }));
                    }}
                    className="cursor-pointer w-4 h-4 text-brand-green"
                  />
                  <div style={MarkerStyle(category.id)} />
                  <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">{category.name}</label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action Buttons - Now each in their own row */}
          <div className="flex flex-col gap-2">
            {/* Pins Dashboard Button - New */}
            <Link 
              href="/map/pins"
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="font-medium">Pin Directory</span>
            </Link>
            
            {/* Add Pin Button */}
            <button
              onClick={() => handleButtonClick(onOpenSubmitForm)}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-light transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium">Add Location</span>
            </button>
            
            {/* Settings Button (Renamed from Account) */}
            <button
              onClick={() => handleButtonClick(onOpenUserPinManager)}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
          </div>
          
          {/* Back button */}
          <Link 
            href="/work" 
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-600 hover:text-brand-green transition-colors"
          >
            ← Back to Projects
          </Link>

          {/* Admin-specific links */}
          {userSession?.isAdmin && (
            <>
              <div className="mt-3 pt-3 border-t border-white/20">
                <h4 className="font-semibold text-sm text-white/70 mb-1">Admin</h4>
                <Link 
                  href="/admin/pins" 
                  className="block text-white/90 hover:text-white py-1 text-sm"
                >
                  Pin Directory
                </Link>
                <Link 
                  href="/admin/users" 
                  className="block text-white/90 hover:text-white py-1 text-sm"
                >
                  User Management
                </Link>
                <Link 
                  href="/admin/submissions" 
                  className="block text-white/90 hover:text-white py-1 text-sm"
                >
                  View Submissions
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
} 