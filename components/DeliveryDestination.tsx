"use client";

import { useState, useEffect } from"react";
import dynamic from"next/dynamic";
import { geocodeAddress } from"@/lib/geocode";

type Pos = { lat: number; lng: number };

const LocationMap = dynamic(() => import("@/components/map/LocationMap"), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full bg-neutral-100 rounded-[8px] animate-pulse flex items-center justify-center text-xs text-[#6B7280]">Loading map components...</div>,
});

type DeliveryDestinationProps = {
  buyerPos: Pos | null;
  setBuyerPos: (pos: Pos) => void;
  locationAddress: string;
  setLocationAddress: (addr: string) => void;
  maxDistance: number;
  setMaxDistance: (dist: number) => void;
};

export default function DeliveryDestination({
  buyerPos,
  setBuyerPos,
  locationAddress,
  setLocationAddress,
  maxDistance,
  setMaxDistance,
}: DeliveryDestinationProps) {
  const [addressInput, setAddressInput] = useState(locationAddress);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setAddressInput(locationAddress);
  }, [locationAddress]);

  const handleSetLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setSearching(true);
    setError(false);
    try {
      const result = await geocodeAddress(addressInput);
      setSearching(false);
      if (result) {
        setBuyerPos(result);
        setLocationAddress(addressInput.trim());
      } else {
        setError(true);
      }
    } catch (err) {
      setSearching(false);
      setError(true);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxDistance(Number(e.target.value));
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-[0_2px_8px_rgba(15,30,60,0.02)] space-y-4 text-left">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">
          Delivery destination
        </h3>
        <p className="text-[11px] text-[#6B7280]">
          Specify destination to filter suppliers by transport range.
        </p>
      </div>

      {/* Input + Set button side by side */}
      <form onSubmit={handleSetLocation} className="flex gap-2">
        <div className="relative flex-1 flex items-center">
          <svg className="absolute left-3 w-4 h-4 text-[#6B7280] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Search city, district..."
            className="w-full h-10 pl-9 pr-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] placeholder:text-neutral-400 font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !addressInput.trim()}
          className="h-10 px-4 bg-[#0F1E3C] hover:bg-[#1A315C] text-xs font-bold text-white rounded-[8px] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {searching ?"..." :"Set"}
        </button>
      </form>

      {/* Geocoding Error Alert */}
      {error && (
        <p className="text-[11px] font-semibold text-[#EF4444] animate-fade-in">
          Could not locate address. Try specifying state or country.
        </p>
      )}

      {/* Green confirmation pill */}
      {buyerPos && locationAddress && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[11px] font-bold text-[#22C55E] animate-fade-in">
          <span>📍</span> {locationAddress}
        </div>
      )}

      {/* Map display - full card width, 240px height */}
      <div className="h-[240px] w-full overflow-hidden rounded-[8px] border border-[#E5E7EB] relative z-0 bg-neutral-50">
        <LocationMap 
          value={buyerPos} 
          onPick={(p) => {
            setBuyerPos(p);
            setLocationAddress(`${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`);
          }} 
          height={240} 
          radius={buyerPos ? maxDistance : undefined}
        />
      </div>

      {/* Proximity Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
          <span>Max radius</span>
          <span className="text-[#0F1E3C] font-semibold">
            {maxDistance === 500 ?"Any" :`${maxDistance} km`}
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="500"
          step="5"
          value={maxDistance}
          onChange={handleSliderChange}
          className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
        />
      </div>

    </div>
  );
}
