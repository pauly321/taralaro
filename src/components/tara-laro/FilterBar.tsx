import React, { useState } from 'react';
import { Calendar, MapPin, DollarSign, SlidersHorizontal, Map } from 'lucide-react';

interface FilterBarProps {
  activeFilters: string[];
  onFilterToggle: (filter: string) => void;
  onMapView: () => void;
}

const filterChips = [
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'entry_fee', label: 'Entry Fee', icon: DollarSign },
  { id: 'more', label: 'Filters', icon: SlidersHorizontal },
];

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilters, onFilterToggle, onMapView }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
      {filterChips.map((chip) => {
        const isActive = activeFilters.includes(chip.id);
        const Icon = chip.icon;
        return (
          <button
            key={chip.id}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0"
            style={{
              backgroundColor: isActive ? '#F4722B' : 'rgba(245, 239, 224, 0.06)',
              color: isActive ? '#fff' : 'rgba(245, 239, 224, 0.6)',
              border: isActive ? '1px solid #F4722B' : '1px solid rgba(245, 239, 224, 0.12)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onClick={() => onFilterToggle(chip.id)}
          >
            <Icon size={12} />
            {chip.label}
          </button>
        );
      })}

      {/* Map view toggle */}
      <button
        className="flex items-center gap-1.5 ml-auto px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0"
        style={{
          backgroundColor: 'rgba(0, 180, 166, 0.15)',
          color: '#00B4A6',
          border: '1px solid rgba(0, 180, 166, 0.3)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
        onClick={onMapView}
      >
        <Map size={12} />
        Map View
      </button>
    </div>
  );
};
