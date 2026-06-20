"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { geocodeAddress } from "@/lib/geocode";

type Pos = { lat: number; lng: number };

const LocationMap = dynamic(() => import("@/components/map/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full bg-neutral-100 rounded-lg animate-pulse flex items-center justify-center text-xs text-gray-500 font-semibold">
      Loading map components...
    </div>
  ),
});

type DeliveryDestinationProps = {
  coords: Pos | null;
  setCoords: (pos: Pos) => void;
  destination: string;
  setDestination: (addr: string) => void;
  radius: number;
  setRadius: (dist: number) => void;
  isMobile?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
};

export default function DeliveryDestination({
  coords,
  setCoords,
  destination,
  setDestination,
  radius,
  setRadius,
  isMobile = false,
  expanded = true,
  onToggle,
}: DeliveryDestinationProps) {
  const [addressInput, setAddressInput] = useState(destination);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setAddressInput(destination);
  }, [destination]);

  const handleSetLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setSearching(true);
    setError(false);
    try {
      const result = await geocodeAddress(addressInput);
      setSearching(false);
      if (result) {
        setCoords(result);
        setDestination(addressInput.trim());
      } else {
        setError(true);
      }
    } catch (err) {
      setSearching(false);
      setError(true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRadius(Number(e.target.value));
  };

  return (
    <div className="space-y-5 text-left">
      {/* Title */}
      <div 
        className={`flex justify-between items-center ${isMobile ? "cursor-pointer select-none" : ""}`}
        onClick={() => isMobile && onToggle?.()}
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-900">
            Delivery destination
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Specify destination to filter suppliers by transport range
          </p>
        </div>
        {isMobile && (
          <button 
            type="button" 
            className="text-xs font-semibold text-[#0F1E3C] bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {expanded && (
        <>
          {/* Input + Set button side by side */}
          <form onSubmit={handleSetLocation} className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <svg className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Search city, district..."
                className="w-full h-10 pl-9 pr-3 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] placeholder:text-neutral-400 font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !addressInput.trim()}
              className="h-10 px-4 bg-[#0F1E3C] hover:bg-[#1a2f5e] text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {searching ? "..." : "Set"}
            </button>
          </form>

          {/* Geocoding Error Alert */}
          {error && (
            <p className="text-xs font-semibold text-red-600 animate-fade-in">
              Could not locate address. Try specifying state or country.
            </p>
          )}

          {/* Confirmation location badge */}
          {coords && destination && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-bold text-green-800 animate-fade-in">
              <span>📍</span> {destination}
            </div>
          )}

          {/* Map display - 280px height */}
          <div className="h-[280px] w-full overflow-hidden rounded-lg border border-gray-100 relative z-0 bg-neutral-50">
            <LocationMap 
              value={coords} 
              onPick={(p) => {
                setCoords(p);
                setDestination(`${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`);
              }} 
              height={280} 
              radius={coords ? radius : undefined}
            />
          </div>

          {/* Max radius slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
              <span>Max radius</span>
              <span className="text-[#0F1E3C] font-bold">
                {radius === 500 ? "Any" : `${radius} km`}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="500"
              step="5"
              value={radius}
              onChange={handleSliderChange}
              className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
            />
          </div>
        </>
      )}
    </div>
  );
}
