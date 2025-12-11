'use client';

import { useState, useEffect, useRef } from 'react';
import { PinSubmission, UserSession } from './types';
import { categories } from './MarkerStyle';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';

interface PinSubmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: [number, number] | null;
  onSubmit: (submission: Omit<PinSubmission, 'status' | 'submittedAt' | 'updatedAt'>) => void;
  map: mapboxgl.Map | null;
  setSubmissionCoordinates: (coords: [number, number] | null) => void;
  submissionMarker: mapboxgl.Marker | null;
  setSubmissionMarker: (marker: mapboxgl.Marker | null) => void;
  isSidebarOpen?: boolean; // Add this prop to know if sidebar is open
  userSession?: UserSession | null; // Add userSession prop
}

export default function PinSubmissionForm({ 
  isOpen, 
  onClose, 
  coordinates, 
  onSubmit,
  map,
  setSubmissionCoordinates,
  submissionMarker,
  setSubmissionMarker,
  isSidebarOpen = false, // Default to false if not provided
  userSession = null // Default to null if not provided
}: PinSubmissionFormProps) {
  const [step, setStep] = useState<'map' | 'form'>('map');
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [name, setName] = useState('');
  const [elevation, setElevation] = useState('');
  const [elevationLoading, setElevationLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [includeSubmitterName, setIncludeSubmitterName] = useState(false);
  const [includeSubmitterEmail, setIncludeSubmitterEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if the selected category is a peak (high or low)
  const isPeakCategory = categoryId === 'highpeaks' || categoryId === 'lowpeaks';

  // Load user session data when the component mounts, when isOpen changes, or when userSession changes
  useEffect(() => {
    // First try to use the userSession prop if available
    if (userSession && userSession.isLoggedIn) {
      setSubmitterName(userSession.name);
      setSubmitterEmail(userSession.email);
    } 
    // Fall back to localStorage if userSession prop isn't available
    else if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (session.isLoggedIn) {
            setSubmitterName(session.name);
            setSubmitterEmail(session.email);
          }
        } catch (err) {
          console.error('Error parsing user session:', err);
        }
      }
    }
  }, [isOpen, userSession]); // Added userSession as a dependency

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setStep('map');
      setMinimized(false);
      
      // Only reset form fields when opening the modal, not when switching steps
      if (!coordinates) {
        setCategoryId(categories[0].id);
        setName('');
        setElevation('');
        setDescription('');
        setSubmitterName('');
        setSubmitterEmail('');
        setIncludeSubmitterName(false);
        setIncludeSubmitterEmail(false);
        setError(null);
      }
      
      // Automatically minimize the dialog after a short delay
      timeoutRef.current = setTimeout(() => {
        setMinimized(true);
      }, 1500);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [isOpen, coordinates]);

  // Get elevation data when entering form step with coordinates for peak categories only
  useEffect(() => {
    if (step === 'form' && coordinates && map && isPeakCategory) {
      getElevationData(coordinates);
    }
  }, [step, coordinates, map, isPeakCategory]);

  // Function to get elevation data from Mapbox
  const getElevationData = async (coords: [number, number]) => {
    if (!map) return;
    
    setElevationLoading(true);
    
    try {
      // Use queryTerrainElevation to get elevation data from Mapbox
      const elevation = await map.queryTerrainElevation(coords, { exaggerated: false });
      
      if (elevation !== null && elevation !== undefined) {
        // Convert to feet (Mapbox returns meters)
        const elevationFeet = Math.round(elevation * 3.28084);
        setElevation(elevationFeet.toString());
      } else {
        setElevation('');
      }
    } catch (err) {
      console.error('Error getting elevation data:', err);
      setElevation('');
    } finally {
      setElevationLoading(false);
    }
  };

  // Add click listener when in map step
  useEffect(() => {
    if (isOpen && step === 'map' && map) {
      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        if (!map) return;
        
        const newCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setSubmissionCoordinates(newCoords);
        
        // Create or update temporary marker
        if (submissionMarker) {
          submissionMarker.setLngLat(newCoords);
        } else {
          const el = document.createElement('div');
          el.className = 'submission-marker';
          // Create pin-style marker
          el.style.width = '24px';
          el.style.height = '36px';
          el.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 36\'%3E%3Cpath fill=\'%231F3F28\' stroke=\'white\' stroke-width=\'1.5\' d=\'M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12zm0 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z\'/%3E%3Ccircle fill=\'white\' cx=\'12\' cy=\'12\' r=\'6\'/%3E%3C/svg%3E")';
          el.style.backgroundSize = 'contain';
          el.style.backgroundRepeat = 'no-repeat';
          el.style.cursor = 'pointer';
          el.style.transformOrigin = 'bottom center';
          el.style.animation = 'markerDrop 0.5s ease-out';
          
          // Add animation style
          if (!document.getElementById('marker-animation-style')) {
            const style = document.createElement('style');
            style.id = 'marker-animation-style';
            style.textContent = `
              @keyframes markerDrop {
                0% { transform: translateY(-20px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
              }
            `;
            document.head.appendChild(style);
          }
          
          const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
            offset: [0, 0]
          })
            .setLngLat(newCoords)
            .addTo(map);
          
          setSubmissionMarker(marker);
        }
      };
      
      map.on('click', handleMapClick);
      
      return () => {
        map.off('click', handleMapClick);
      };
    }
  }, [isOpen, step, map, submissionMarker, setSubmissionCoordinates, setSubmissionMarker]);

  const handleContinue = () => {
    if (!coordinates) {
      setError('Please click on the map to select a location');
      
      // Show notification
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg z-[60] text-sm font-medium';
      toast.textContent = 'Please click on the map to select a pin location first';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
      
      return;
    }
    setStep('form');
    setMinimized(false); // Expand when going to form step
    setError(null);
  };

  const handleBack = () => {
    setStep('map');
    setMinimized(true); // Minimize when going back to map step
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!coordinates) {
      setError('Please select a location on the map');
      return;
    }

    if (!name || !categoryId || !submitterName || !submitterEmail) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submission: Omit<PinSubmission, 'status' | 'submittedAt' | 'updatedAt'> = {
        name,
        coordinates,
        categoryId,
        description: description || '', // Ensure description is always a string, even if empty
        submitterName,
        submitterEmail,
        includeSubmitterName,
        includeSubmitterEmail,
        // Only include elevation for peak categories
        ...(isPeakCategory && elevation ? { elevation } : {}),
        requestType: 'addition' // Default to addition request
      };

      await onSubmit(submission);
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
      toast.textContent = 'Thank you for your submission! It will be reviewed by our team.';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      onClose();
    } catch (err) {
      setError('Failed to submit pin. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Remove the temporary marker when canceling
    if (submissionMarker) {
      submissionMarker.remove();
      setSubmissionMarker(null);
    }
    setSubmissionCoordinates(null);
    onClose();
  };

  // Handle category change and reset elevation if switching from peak to non-peak
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = e.target.value;
    setCategoryId(newCategoryId);
    
    // If switching from peak to non-peak category, reset elevation
    const newIsPeakCategory = newCategoryId === 'highpeaks' || newCategoryId === 'lowpeaks';
    if (!newIsPeakCategory && isPeakCategory) {
      setElevation('');
    } else if (newIsPeakCategory && !isPeakCategory && coordinates && map) {
      // If switching to a peak category, get elevation data
      getElevationData(coordinates);
    }
  };

  // Toggle between minimized and expanded states
  const toggleMinimized = () => {
    setMinimized(!minimized);
  };

  if (!isOpen) return null;

  // Calculate position adjustment for sidebar
  const sidebarAdjustment = isSidebarOpen ? 
    'md:ml-[340px]' : 
    'md:ml-[50px]'; // Account for the collapsed sidebar handle

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {step === 'map' && (
            <>
              {/* Light vignette overlay - made more subtle */}
              {!minimized && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-40"
                  style={{
                    background: 'radial-gradient(circle, rgba(0,0,0,0) 70%, rgba(0,0,0,0.2) 100%)',
                  }}
                />
              )}

              {/* Dialog container with animation */}
              <div 
                className={`absolute z-50 pointer-events-none ${sidebarAdjustment} transition-all duration-300`}
                style={{
                  width: minimized ? 'auto' : 'calc(100% - 32px)',
                  maxWidth: '480px',
                  left: minimized ? '16px' : '50%',
                  transform: minimized ? 'translateX(0)' : 'translateX(-50%)',
                  bottom: minimized ? '16px' : '50%',
                  marginBottom: minimized ? '0' : '-180px', // Half the height for vertical centering
                }}
              >
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 1 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: minimized ? 0.85 : 1,
                  }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ 
                    duration: 0.4,
                    ease: "easeInOut"
                  }}
                  className="bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden pointer-events-auto relative"
                >
                  <div className={`text-center p-6 space-y-4 ${minimized ? 'pb-4' : ''}`}>
                    <button 
                      onClick={toggleMinimized}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 bg-white/80 rounded-full p-1.5 shadow-sm"
                    >
                      {minimized ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                    
                    {!minimized && (
                      <div className="bg-brand-green/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                    
                    <div>
                      <h2 className={`${minimized ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
                        Add New Location
                      </h2>
                      {!minimized && (
                        <p className="text-gray-600 mt-1">
                          Click anywhere on the map to place your pin
                        </p>
                      )}
                    </div>
                    
                    {coordinates && (
                      <div className={`bg-brand-green/5 border border-brand-green/20 rounded-lg px-4 py-${minimized ? '2' : '3'}`}>
                        <p className="text-sm text-gray-700 font-medium">
                          Selected coordinates:
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={handleContinue}
                        disabled={!coordinates}
                        className={`px-${minimized ? '4' : '6'} py-${minimized ? '2' : '3'} rounded-lg text-white font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green shadow-md ${
                          coordinates 
                            ? 'bg-brand-green hover:bg-brand-green-light transform hover:translate-y-[-2px]' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {coordinates ? 'Continue' : 'Select a Location'}
                      </button>
                    </div>
                    
                    {!minimized && (
                      <button
                        type="button" 
                        onClick={handleCancel}
                        className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            </>
          )}
          {step === 'form' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${sidebarAdjustment}`}
              onClick={handleCancel}
            >
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl overflow-y-auto max-w-md w-full max-h-[85vh]"
                style={{
                  marginLeft: isSidebarOpen ? "0" : "0", // Adjusted for sidebar
                }}
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Submit New Location</h2>
                    <button 
                      onClick={handleCancel}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {coordinates && (
                    <div className="bg-green-50 rounded-md p-3 mb-4 border border-green-200">
                      <div className="flex items-center text-green-700 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">Location selected</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <p>Coordinates: {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}</p>
                        {isPeakCategory && elevation && <p>Elevation: {elevation} ft</p>}
                      </div>
                      <button 
                        onClick={handleBack}
                        className="mt-2 text-sm text-brand-green hover:text-brand-green-light flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        Change location
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      {/* Category - Now first field */}
                      <div>
                        <label htmlFor="pin-category" className="block text-sm font-medium text-gray-700">
                          Pin Type *
                        </label>
                        <select
                          id="pin-category"
                          value={categoryId}
                          onChange={handleCategoryChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                          required
                        >
                          {categories
                            .filter(category => category.id !== 'highpeaks') // Filter out High Peaks option
                            .map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                        </select>
                        {categoryId === 'lowpeaks' && (
                          <p className="mt-1 text-xs text-gray-500 italic">
                            Note: There are 46 official High Peaks in the Adirondacks which are already in our database. 
                            Please only submit Low Peaks or other points of interest.
                          </p>
                        )}
                      </div>
                    
                      {/* Location Name */}
                      <div>
                        <label htmlFor="pin-name" className="block text-sm font-medium text-gray-700">
                          Location Name *
                        </label>
                        <input
                          type="text"
                          id="pin-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                          placeholder="e.g. Mount Marcy Summit"
                          required
                        />
                      </div>

                      {/* Elevation - Only shown for high/low peaks */}
                      {isPeakCategory && (
                        <div>
                          <div className="flex items-center justify-between">
                            <label htmlFor="pin-elevation" className="block text-sm font-medium text-gray-700">
                              Elevation (ft)
                            </label>
                            {elevationLoading && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <svg className="animate-spin h-3 w-3 mr-1 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Auto-detecting...
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              id="pin-elevation"
                              value={elevation}
                              onChange={(e) => setElevation(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                              placeholder={elevationLoading ? "Detecting elevation..." : "Auto-detected from map (feet)"}
                              disabled={elevationLoading}
                            />
                            {elevation && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Automatically detected from map. You can adjust if needed.
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      <div>
                        <label htmlFor="pin-description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="pin-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                          placeholder="Add any helpful details about this location..."
                        />
                      </div>

                      {/* Submitter Info */}
                      <div className="pt-2 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Your Information</h3>
                        
                        <div className="space-y-4">
                          {/* Name */}
                          <div>
                            <div className="flex items-center justify-between">
                              <label htmlFor="submitter-name" className="block text-sm font-medium text-gray-700">
                                Your Name *
                              </label>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="include-name"
                                  checked={includeSubmitterName}
                                  onChange={(e) => setIncludeSubmitterName(e.target.checked)}
                                  className="h-4 w-4 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                                />
                                <label htmlFor="include-name" className="ml-2 text-xs text-gray-500">
                                  Show on pin
                                </label>
                              </div>
                            </div>
                            <input
                              type="text"
                              id="submitter-name"
                              value={submitterName}
                              onChange={(e) => setSubmitterName(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                              required
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <div className="flex items-center justify-between">
                              <label htmlFor="submitter-email" className="block text-sm font-medium text-gray-700">
                                Your Email *
                              </label>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="include-email"
                                  checked={includeSubmitterEmail}
                                  onChange={(e) => setIncludeSubmitterEmail(e.target.checked)}
                                  className="h-4 w-4 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                                />
                                <label htmlFor="include-email" className="ml-2 text-xs text-gray-500">
                                  Show on pin
                                </label>
                              </div>
                            </div>
                            <input
                              type="email"
                              id="submitter-email"
                              value={submitterEmail}
                              onChange={(e) => setSubmitterEmail(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green sm:text-sm"
                              required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Required for verification. Check the boxes to include your information on the pin (optional).
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                        {error}
                      </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-green hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green ${
                          isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Location'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
} 