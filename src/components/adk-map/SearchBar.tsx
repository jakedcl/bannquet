'use client';

import { useState } from 'react';
import { Pin, PinData } from './types';

interface SearchBarProps {
  pins: PinData;
  setSelectedPin: (pin: Pin | null) => void;
  flyToPin: (pin: Pin) => void;
}

export default function SearchBar({ 
  pins, 
  setSelectedPin, 
  flyToPin 
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Pin[]>([]);

  // Handle search input changes
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query) {
      setSearchResults([]);
      return;
    }

    // Combine all pins into a single array for searching
    const allPins = Object.values(pins).flat();

    // Filter pins based on search query
    const results = allPins.filter(pin =>
      pin.name.toLowerCase().includes(query)
    );

    setSearchResults(results);
  };

  // Handle selection of a search result
  const handleSelect = (pin: Pin) => {
    if (pin) {
      setSelectedPin(pin);
      flyToPin(pin);
      setSearchQuery('');
      setSearchResults([]); // Clear results after selection
    }
  };

  return (
    <div className="relative w-full z-10">
      <input
        type="text"
        placeholder="Search for pins..."
        value={searchQuery}
        onChange={handleSearch}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm"
      />
      {searchResults.length > 0 && (
        <div className="absolute w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-md mt-1">
          {searchResults.map((pin, index) => (
            <div
              key={index}
              onClick={() => handleSelect(pin)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100"
            >
              {pin.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 