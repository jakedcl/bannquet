'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Pin, PinData, VisibleCategories } from './types';
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
}

export default function Sidebar({
  pins,
  setSelectedPin,
  flyToPin,
  visibleCategories,
  setVisibleCategories,
  selectedPin,
  isOpen,
  onOpenChange
}: SidebarProps) {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const handleHeight = 40; // px
  
  // Reset translateY when open state changes
  useEffect(() => {
    setTranslateY(0);
  }, [isOpen]);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    
    // When open, only allow downward swipe (positive diff)
    if (isOpen && diff > 0) {
      setTranslateY(diff);
    } 
    // When closed, only allow upward swipe (negative diff)
    else if (!isOpen && diff < 0) {
      // Convert from handleHeight-anchored position to calculate from bottom
      setTranslateY(diff);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (touchStartY === null) return;
    
    // Threshold to determine if drawer should open or close
    const threshold = 100; // px
    
    if (isOpen && translateY > threshold) {
      // Close the drawer if open and swiped down enough
      onOpenChange(false);
    } else if (!isOpen && translateY < -threshold) {
      // Open the drawer if closed and swiped up enough
      onOpenChange(true);
    }
    
    // Reset states
    setTouchStartY(null);
    setTranslateY(0);
    setIsDragging(false);
  };

  // Calculate transform style based on current state
  const getTransformStyle = () => {
    if (isDragging) {
      if (isOpen) {
        // When open and dragging, move down from the fully open position
        return `translateY(${translateY}px)`;
      } else {
        // When closed and dragging, move up from the peek position
        const closedPosition = `calc(100% - ${handleHeight}px)`;
        return `translateY(calc(${closedPosition} + ${translateY}px))`;
      }
    } else {
      // Not dragging - use the normal open/closed position
      return isOpen ? 'translateY(0)' : `translateY(calc(100% - ${handleHeight}px))`;
    }
  };

  return (
    <>
      {/* Main Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`fixed z-20 bg-white/95 backdrop-blur-md shadow-lg
          flex flex-col overflow-hidden
          
          /* Desktop Styles */
          md:top-[72px] md:left-0 md:h-[calc(100vh-72px)] md:w-[300px] md:rounded-r-lg
          ${isOpen ? 'md:translate-x-0' : 'md:translate-x-[-290px]'}
          
          /* Mobile Styles */
          max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-[60vh] max-md:rounded-t-xl
          ${isOpen ? 'max-md:translate-y-0' : 'max-md:translate-y-[calc(100%-40px)]'}`}
        style={{
          transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
          transform: typeof window !== 'undefined' && window.innerWidth >= 768 
            ? (isOpen ? 'translateX(0)' : 'translateX(-290px)') 
            : getTransformStyle()
        }}
      >
        {/* Mobile Handle */}
        <div className="md:hidden w-full flex justify-center items-center h-10 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => !isDragging && onOpenChange(!isOpen)}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Desktop Handle - Simple right edge of sidebar */}
        <div 
          className="hidden md:block absolute top-0 right-0 w-10 h-full cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
          onClick={() => onOpenChange(!isOpen)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Content Container */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
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
              <h4 className="text-lg font-medium">{selectedPin.name}</h4>
              <p className="text-sm">Class: {selectedPin.type}</p>
              {selectedPin.elevation && <p className="text-sm">Elevation: {selectedPin.elevation}ft</p>}
              <p className="text-sm">Coordinates: {selectedPin.coordinates.join(', ')}</p>
            </div>
          )}

          {/* Categories Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 mb-2">Categories</div>
            <div className="max-h-[40vh] overflow-y-auto pr-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
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
                  <span className="text-sm">{category.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Back button */}
          <Link 
            href="/work" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-600 hover:text-brand-green transition-colors"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    </>
  );
} 