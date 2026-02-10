'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MdExpandMore, MdExpandLess, MdClose } from 'react-icons/md';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current || typeof window === 'undefined' || !isExpanded) return;

    // Ensure container has dimensions
    const container = mapContainer.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // Wait a bit for container to get dimensions
      const timer = setTimeout(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          initializeMap();
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    initializeMap();

    function initializeMap() {
      if (!mapContainer.current || map.current) return;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        console.error('Mapbox token not found. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env.local file');
        return;
      }

      mapboxgl.accessToken = token;

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: lat && lng ? [lng, lat] : [-73.96, 44.127], // Default to NY Adirondacks
        zoom: lat && lng ? 12 : 6,
      });

      // Wait for map to load before adding controls
      map.current.on('load', () => {
        setIsInitialized(true);
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Create marker
      if (lat && lng) {
        marker.current = new mapboxgl.Marker({
          color: '#22c55e',
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        // Update location when marker is dragged
        marker.current.on('dragend', () => {
          const lngLat = marker.current!.getLngLat();
          onLocationChange(lngLat.lat, lngLat.lng);
        });
      }

      // Handle map clicks
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        
        // Update or create marker
        if (marker.current) {
          marker.current.setLngLat([lng, lat]);
        } else {
          marker.current = new mapboxgl.Marker({
            color: '#22c55e',
            draggable: true,
          })
            .setLngLat([lng, lat])
            .addTo(map.current!);

          // Update location when marker is dragged
          marker.current.on('dragend', () => {
            const lngLat = marker.current!.getLngLat();
            onLocationChange(lngLat.lat, lngLat.lng);
          });
        }

        onLocationChange(lat, lng);
      });
    }

    return () => {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setIsInitialized(false);
    };
  }, [isExpanded, lat, lng, onLocationChange]);

  // Resize map when expanded state changes
  useEffect(() => {
    if (map.current && isExpanded) {
      // Small delay to ensure container is visible
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    }
  }, [isExpanded]);

  // Update marker position when lat/lng changes externally
  useEffect(() => {
    if (map.current && marker.current && lat && lng) {
      marker.current.setLngLat([lng, lat]);
      map.current.flyTo({
        center: [lng, lat],
        zoom: 12,
        duration: 1000,
      });
    } else if (map.current && !marker.current && lat && lng) {
      // Create marker if it doesn't exist
      marker.current = new mapboxgl.Marker({
        color: '#22c55e',
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current!.getLngLat();
        onLocationChange(lngLat.lat, lngLat.lng);
      });
    } else if (map.current && marker.current && (!lat || !lng)) {
      // Remove marker if location is cleared
      marker.current.remove();
      marker.current = null;
    }
  }, [lat, lng, onLocationChange]);

  const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding/collapsing when clicking clear
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
    // Use a special value to indicate clear - parent should handle null
    onLocationChange(NaN, NaN);
  };

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Choose a pin on the map</span>
          {hasLocation && (
            <span className="text-xs text-gray-500">
              ({lat!.toFixed(4)}, {lng!.toFixed(4)})
            </span>
          )}
          </div>
          {isExpanded ? (
            <MdExpandLess className="text-gray-600" size={20} />
          ) : (
            <MdExpandMore className="text-gray-600" size={20} />
          )}
        </button>
        {hasLocation && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-3 bg-red-50 hover:bg-red-100 border border-red-300 rounded-xl transition-colors text-red-600"
            title="Clear location"
          >
            <MdClose size={20} />
          </button>
        )}
      </div>

      {/* Collapsible Map */}
      {isExpanded && (
        <div className="w-full">
          <div
            ref={mapContainer}
            className="w-full h-96 rounded-xl overflow-hidden border border-gray-300"
            style={{ minHeight: '384px', width: '100%' }}
          />
          {!isInitialized && (
            <div className="mt-2 text-sm text-gray-500 text-center">
              Loading map...
            </div>
          )}
          {isInitialized && (
            <p className="mt-2 text-xs text-gray-500 text-center">
              Click on the map to set your location, or drag the pin to adjust
            </p>
          )}
        </div>
      )}

      {/* Show coordinates when collapsed */}
      {!isExpanded && hasLocation && (
        <div className="text-xs text-gray-500 text-center mt-1">
          Location: {lat!.toFixed(4)}, {lng!.toFixed(4)}
        </div>
      )}
    </div>
  );
}
