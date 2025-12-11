'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Pin, PinData, VisibleCategories, PinSubmission, UserSession, Category } from './types';
import Sidebar from './Sidebar';
import MarkerStyle, { categories } from './MarkerStyle';
import PinSubmissionForm from './PinSubmissionForm';
import UserPinManager from './UserPinManager';
import { MapRegionConfig, RegionCode } from '@/lib/regions';

const buildVisibilityMap = (items: Category[]): VisibleCategories => {
  return items.reduce((acc, category) => {
    acc[category.id] = true;
    return acc;
  }, {} as VisibleCategories);
};

type AdirondacksMapProps = {
  region: RegionCode;
  config: MapRegionConfig;
};

export default function AdirondacksMap({ region, config }: AdirondacksMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [pins, setPins] = useState<PinData>({});
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const regionCategories = useMemo(() => config.categories ?? categories, [config]);
  const [visibleCategories, setVisibleCategories] = useState<VisibleCategories>(() =>
    buildVisibilityMap(regionCategories)
  );
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [currentStyle, setCurrentStyle] = useState(config.defaultStyle);
  const [mapError, setMapError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Pin submission states
  const [isSubmitFormOpen, setIsSubmitFormOpen] = useState(false);
  const [isUserPinManagerOpen, setIsUserPinManagerOpen] = useState(false);
  const [submissionCoordinates, setSubmissionCoordinates] = useState<[number, number] | null>(null);
  const [submissionMarker, setSubmissionMarker] = useState<mapboxgl.Marker | null>(null);
  
  // User session state
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  
  // Define fetchPins function in component scope
  const fetchPins = useCallback(async () => {
    try {
      const data: PinData = {};
      await Promise.all(
        regionCategories.map(async (category) => {
          const response = await fetch(`/api/adk/${category.id}?region=${region}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const responseData = await response.json();
          data[category.id] = responseData.data.pins;
        })
      );
      setPins(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [region, regionCategories]);
  
  useEffect(() => {
    setVisibleCategories(buildVisibilityMap(regionCategories));
  }, [regionCategories]);

  useEffect(() => {
    setCurrentStyle(config.defaultStyle);
  }, [config]);

  // Load user session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setUserSession(session);
        } catch (err) {
          console.error('Error parsing user session:', err);
        }
      }
    }
    
    // Setup listener for session changes
    const handleStorageChange = () => {
      const updatedSession = localStorage.getItem('adkMapUserSession');
      if (updatedSession) {
        try {
          const session = JSON.parse(updatedSession);
          setUserSession(session);
        } catch (err) {
          console.error('Error parsing user session:', err);
        }
      } else {
        setUserSession(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize map when component mounts
  useEffect(() => {
    // Don't try to initialize if already initialized or ref not ready
    if (mapContainerRef.current && !map) {
      // Initialize map is handled in the next useEffect
    }
    
    // Check for addLocation parameter in URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('addLocation') === 'true') {
        // Remove parameter from URL without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        // Open the form after a slight delay to ensure map is loaded
        setTimeout(() => {
          handleOpenSubmitForm();
        }, 1000);
      }
    }
  }, [map]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) {
      console.error('Map container ref is null');
      return;
    }
    
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      console.error('Mapbox token is missing. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file.');
      setMapError(true);
      return;
    }
    
    if (map) {
      // Map is already initialized
      return;
    }
    
    console.log('Initializing map with token:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN.substring(0, 10) + '...');
    console.log('Map container dimensions:', mapContainerRef.current.offsetWidth, mapContainerRef.current.offsetHeight);
    
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: currentStyle,
        center: config.center,
        zoom: 9,
        pitch: 0,
        bearing: 0,
        maxBounds: config.bounds,
        dragRotate: true,
        touchZoomRotate: true,
        cooperativeGestures: false,
        attributionControl: false,
        logoPosition: 'bottom-right'
      });

      console.log('Map instance created');

      const navControl = new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true
      });
      mapInstance.addControl(navControl, 'top-right');

      mapInstance.on('load', () => {
        console.log('Map loaded');
        
        // Add terrain source and enable 3D terrain
        try {
          mapInstance.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
          });
          
          // Add terrain layer
          mapInstance.setTerrain({ 
            'source': 'mapbox-dem', 
            'exaggeration': 0 
          });
          
          // Adjust sky layer to enhance 3D effect
          mapInstance.setFog({
            'color': 'rgba(255, 255, 255, 0.8)',
            'horizon-blend': 0.1,
            'space-color': 'rgb(220, 235, 255)',
            'star-intensity': 0.5
          });
          
          console.log('3D terrain configured successfully');
        } catch (err) {
          console.error('Error setting up 3D terrain:', err);
        }
        
        // Check for addLocation parameter in URL after map is loaded
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('addLocation') === 'true') {
            // Remove parameter from URL without refreshing
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            // Open the submission form
            handleOpenSubmitForm();
          }
        }
        
        // Load pins after map is loaded
        fetchPins();
      });

      mapInstance.on('error', (e) => {
        console.error('Mapbox error:', e);
      });
      
      // Update map state
      setMap(mapInstance);

      return () => mapInstance.remove();
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }
  }, [config, currentStyle, fetchPins]);

  // Fetch pins
  useEffect(() => {
    if (map) {
      fetchPins();
    }
    
    // Reference userSession to satisfy linter
    console.log("User session state:", userSession ? "logged in" : "not logged in");
  }, [fetchPins, map, userSession]);

  // Fly to pin
  const flyToPin = useCallback((pin: Pin) => {
    if (map && pin?.coordinates) {
      map.flyTo({
        center: pin.coordinates,
        zoom: 13,
        pitch: 0,
        bearing: 0,
        speed: 0.8,
        curve: 1,
        easing: (t) => t,
      });
    }
  }, [map]);

  // Update markers based on visible categories
  useEffect(() => {
    if (map && Object.keys(pins).length > 0) {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Create markers for each category
      Object.keys(pins).forEach(categoryId => {
        if (visibleCategories[categoryId]) {
          pins[categoryId].forEach(pin => {
            const el = document.createElement('div');
            el.className = 'marker';

            // Apply marker style
            const style = MarkerStyle(categoryId);
            Object.assign(el.style, style);

            // Create popup with pin information
            const popup = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: '300px',
              className: 'mapboxgl-popup-custom'
            }).setHTML(`
              <div class="p-3">
                <h3 class="text-lg font-medium mb-1">${pin.name}</h3>
                <div class="text-sm space-y-1">
                  <p class="text-gray-700">Category: ${categories.find(c => c.id === categoryId)?.name || categoryId}</p>
                  ${pin.elevation ? `<p class="text-gray-700">Elevation: ${pin.elevation} ft</p>` : ''}
                  <p class="text-gray-700">Coordinates: ${pin.coordinates[0].toFixed(6)}, ${pin.coordinates[1].toFixed(6)}</p>
                  
                  ${pin.description ? `<p class="text-gray-700 mt-2 border-t border-gray-100 pt-2">${pin.description}</p>` : ''}
                  
                  ${pin.submitterName && pin.includeSubmitterName ? 
                    `<div class="mt-3 pt-2 border-t border-gray-200">
                      <p class="text-xs text-gray-500">Submitted by:</p>
                      <p class="text-sm">${pin.submitterName}</p>
                      ${pin.submitterEmail && pin.includeSubmitterEmail ? 
                        `<p class="text-sm text-gray-600">${pin.submitterEmail}</p>` : ''}
                    </div>` 
                    : ''}
                </div>
              </div>
            `);

            // Add click handler
            el.addEventListener('click', () => {
              setSelectedPin(pin);
              flyToPin(pin);
            });

            // Create and add marker
            const marker = new mapboxgl.Marker(el)
              .setLngLat(pin.coordinates)
              .setPopup(popup)
              .addTo(map);

            markersRef.current.push(marker);
          });
        }
      });
    }
  }, [map, pins, visibleCategories, flyToPin]);

  // Open the submission form
  const handleOpenSubmitForm = () => {
    // Reset submission state
    if (submissionMarker) {
      submissionMarker.remove();
      setSubmissionMarker(null);
    }
    setSubmissionCoordinates(null);
    setIsSubmitFormOpen(true);
    
    // Change cursor style when the form opens
    if (map && map.getCanvas()) {
      map.getCanvas().style.cursor = 'crosshair';
      
      // Add a class to the body to show a special cursor everywhere
      document.body.classList.add('adding-location-mode');
      
      // Add the special cursor style if not already added
      if (!document.getElementById('cursor-style')) {
        const style = document.createElement('style');
        style.id = 'cursor-style';
        style.textContent = `
          .adding-location-mode {
            cursor: crosshair !important;
          }
          .adding-location-mode button {
            cursor: pointer !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  };

  // Handle submission form close
  const handleCloseSubmitForm = () => {
    setIsSubmitFormOpen(false);
    // If user cancels, remove the marker
    if (submissionMarker) {
      submissionMarker.remove();
      setSubmissionMarker(null);
    }
    setSubmissionCoordinates(null);
    
    // Reset cursor style
    if (map && map.getCanvas()) {
      map.getCanvas().style.cursor = '';
      document.body.classList.remove('adding-location-mode');
    }
  };

  // Handle pin submission
  const handleSubmitPin = async (submission: Omit<PinSubmission, 'status' | 'submittedAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/map-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        throw new Error('Failed to submit pin');
      }

      // Remove the temporary marker
      if (submissionMarker) {
        submissionMarker.remove();
        setSubmissionMarker(null);
      }

      setSubmissionCoordinates(null);
      
      // Success handling is now done in the PinSubmissionForm component
    } catch (error) {
      console.error('Error submitting pin:', error);
      alert('Failed to submit your pin. Please try again.');
    }
  };

  if (mapError) {
    return (
      <div className="fixed inset-0">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-white p-5 rounded-lg shadow-md">
          <h3 className="text-lg font-medium">Error loading map</h3>
          <p className="mt-2">Please check your connection and try again</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 mt-[72px] h-[calc(100vh-72px)] w-full">
      <div ref={mapContainerRef} className="absolute inset-0 bg-gray-100 w-full h-full" />
      {map && (
        <>
          {/* Mobile Sidebar Peek Handle - Only shows when sidebar is closed */}
          <div 
            className="md:hidden fixed bottom-0 left-0 right-0 h-[50px] bg-white border-t-2 border-brand-green shadow-lg z-10 flex flex-col justify-center items-center"
            style={{
              transform: sidebarOpen ? 'translateY(100%)' : 'translateY(0)',
              transition: 'transform 0.3s ease-in-out',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            onClick={() => setSidebarOpen(true)}
          >
            <div className="w-12 h-1.5 bg-brand-green rounded-full mb-2"></div>
            <div className="flex justify-between w-full px-6 text-sm font-medium">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Map Filters</span>
              </div>
              <div className="bg-brand-green/10 px-2 py-0.5 rounded-full text-brand-green text-xs">
                {Object.values(visibleCategories).filter(v => v).length} active
              </div>
            </div>
          </div>
          
          <Sidebar
            pins={pins}
            setSelectedPin={setSelectedPin}
            flyToPin={flyToPin}
            visibleCategories={visibleCategories}
            setVisibleCategories={setVisibleCategories}
            selectedPin={selectedPin}
            isOpen={sidebarOpen}
            onOpenChange={setSidebarOpen}
            onOpenSubmitForm={handleOpenSubmitForm}
            onOpenUserPinManager={() => setIsUserPinManagerOpen(true)}
          />
          
          {/* Map controls */}

          {/* Pin Submission Form */}
          <PinSubmissionForm
            isOpen={isSubmitFormOpen}
            onClose={handleCloseSubmitForm}
            coordinates={submissionCoordinates}
            onSubmit={handleSubmitPin}
            map={map}
            setSubmissionCoordinates={setSubmissionCoordinates}
            submissionMarker={submissionMarker}
            setSubmissionMarker={setSubmissionMarker}
            isSidebarOpen={sidebarOpen}
            userSession={userSession}
          />
          
          {/* User Pin Manager (includes admin functionality) */}
          <UserPinManager
            isOpen={isUserPinManagerOpen}
            onClose={() => setIsUserPinManagerOpen(false)}
          />
        </>
      )}
    </div>
  );
} 