'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Pin, PinData, VisibleCategories } from './types';
import Sidebar from './Sidebar';
import MarkerStyle, { categories } from './MarkerStyle';

export default function AdirondacksMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [pins, setPins] = useState<PinData>({});
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<VisibleCategories>(
    categories.reduce((acc, category) => {
      acc[category.id] = true;
      return acc;
    }, {} as VisibleCategories)
  );
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [currentStyle, setCurrentStyle] = useState('mapbox://styles/mapbox/satellite-v9');
  const [mapError, setMapError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    
    console.log('Initializing map with token:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN.substring(0, 10) + '...');
    console.log('Map container dimensions:', mapContainerRef.current.offsetWidth, mapContainerRef.current.offsetHeight);
    
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: currentStyle,
        center: [-73.960000, 44.127000],
        zoom: 9,
        pitch: is3D ? 60 : 0,
        bearing: 0,
        maxBounds: [
          [-74.6, 43.85],
          [-73.5, 44.45]
        ],
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
        console.log('Map loaded event triggered');
        try {
          mapInstance.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });

          mapInstance.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
          console.log('Terrain set successfully');
          setMap(mapInstance);
        } catch (error) {
          console.error('Error setting up map sources:', error);
        }
      });

      mapInstance.on('error', (e) => {
        console.error('Mapbox error:', e);
      });

      return () => mapInstance.remove();
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }
  }, [currentStyle, is3D]);

  // Fly to pin
  const flyToPin = useCallback((pin: Pin) => {
    if (map && pin?.coordinates) {
      map.flyTo({
        center: pin.coordinates,
        zoom: 13,
        pitch: is3D ? 60 : 0,
        bearing: 0,
        speed: 0.8,
        curve: 1,
        easing: (t) => t,
      });
    }
  }, [map, is3D]);

  // Fetch pins
  useEffect(() => {
    const fetchPins = async () => {
      try {
        const data: PinData = {};
        await Promise.all(
          categories.map(async (category) => {
            const response = await fetch(`/api/adk/${category.id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const responseData = await response.json();
            data[category.id] = responseData.data.pins;
          })
        );
        setPins(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    if (map) {
      fetchPins();
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

            // Add click handler
            el.addEventListener('click', () => {
              setSelectedPin(pin);
              flyToPin(pin);
            });

            // Create and add marker
            const marker = new mapboxgl.Marker(el)
              .setLngLat(pin.coordinates)
              .addTo(map);

            markersRef.current.push(marker);
          });
        }
      });
    }
  }, [map, pins, visibleCategories, flyToPin]);

  // Toggle 3D mode
  const toggle3D = () => {
    setIs3D(prev => !prev);
    if (map) {
      map.setPitch(is3D ? 0 : 60);
    }
  };

  // Toggle Map Style
  const toggleMapStyle = () => {
    const styles = {
      satellite: 'mapbox://styles/mapbox/satellite-v9',
      outdoors: 'mapbox://styles/mapbox/outdoors-v11',
    };
    
    // Toggle between satellite and outdoors only
    if (currentStyle === styles.satellite) {
      setCurrentStyle(styles.outdoors);
    } else {
      setCurrentStyle(styles.satellite);
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
          <Sidebar
            pins={pins}
            setSelectedPin={setSelectedPin}
            flyToPin={flyToPin}
            visibleCategories={visibleCategories}
            setVisibleCategories={setVisibleCategories}
            selectedPin={selectedPin}
            isOpen={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          
          {/* Map controls - positioned in top right corner */}
          <div 
            className="fixed z-30 transition-all duration-300 flex gap-2 top-4 right-4"
          >
            {/* Navigation Controls Row */}
            <div className="flex flex-row gap-2">
              {/* Zoom Controls */}
              <button 
                onClick={() => map.zoomIn()}
                className="bg-white rounded-full w-10 h-10 shadow-md flex items-center justify-center hover:bg-gray-100"
                title="Zoom In"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              
              <button 
                onClick={() => map.zoomOut()}
                className="bg-white rounded-full w-10 h-10 shadow-md flex items-center justify-center hover:bg-gray-100"
                title="Zoom Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* North Orientation */}
              <button 
                onClick={() => map.setBearing(0)}
                className="bg-white rounded-full w-10 h-10 shadow-md flex items-center justify-center hover:bg-gray-100"
                title="Reset North"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* 3D Toggle */}
              <button 
                onClick={toggle3D}
                className="bg-white rounded-full w-10 h-10 shadow-md flex items-center justify-center hover:bg-gray-100"
                title={is3D ? "Switch to 2D" : "Switch to 3D"}
              >
                {is3D ? "2D" : "3D"}
              </button>
              
              {/* Map Style Toggle */}
              <button 
                onClick={toggleMapStyle}
                className="bg-white rounded-full w-10 h-10 shadow-md flex items-center justify-center hover:bg-gray-100"
                title={currentStyle.includes('satellite') ? "Switch to Topo Map" : "Switch to Satellite"}
              >
                {currentStyle.includes('satellite') ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 