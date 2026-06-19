"use client";

import { useState, useEffect, useMemo } from"react";
import dynamic from"next/dynamic";
import { createClient } from"@/lib/supabase/client";
import { geocodeAddress } from"@/lib/geocode";

const LocationMap = dynamic(() => import("@/components/map/LocationMap"), {
  ssr: false,
  loading: () => <div className="h-80 rounded-xl bg-neutral-100 animate-pulse" />,
});

type Pos = { lat: number; lng: number };

type VendorLocationProps = {
  onSaveComplete?: () => void;
};

export default function VendorLocation({ onSaveComplete }: VendorLocationProps) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [radius, setRadius] = useState<number>(25); // Default radius is 25 km
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", user.id)
        .single();
      if (data?.latitude != null && data?.longitude != null) {
        setPos({ lat: data.latitude, lng: data.longitude });
      }
    })();
  }, [supabase]);

  const findAddress = async () => {
    if (!address.trim()) return;
    setSearching(true);
    setNotFound(false);
    const result = await geocodeAddress(address);
    setSearching(false);
    if (result) {
      setPos(result);
      setSaved(false);
    } else {
      setNotFound(true);
    }
  };

  const save = async () => {
    if (!pos) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    
    const { error } = await supabase
      .from("profiles")
      .update({ latitude: pos.lat, longitude: pos.lng })
      .eq("id", user.id);
      
    setSaving(false);
    if (!error) {
      setSaved(true);
      if (onSaveComplete) {
        setTimeout(() => {
          onSaveComplete();
        }, 1200);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F1E3C] tracking-tight">Set Service Location & Radius</h2>
        <p className="text-sm text-[#6B7280] mt-1">
          Search for your distribution center or primary office, drag the pin to adjust, and specify your maximum delivery radius.
        </p>
      </div>

      {/* Address Search */}
      <div className="flex gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key ==="Enter") findAddress(); }}
          placeholder="e.g. Connaught Place, New Delhi"
          className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400"
        />
        <button
          onClick={findAddress}
          disabled={searching || !address.trim()}
          className="rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          {searching ?"Finding..." :"Find"}
        </button>
      </div>
      
      {notFound && (
        <p className="text-xs font-semibold text-red-600 animate-fade-in">
          We couldn't locate that address. Try entering a city and postal code, or click directly on the map.
        </p>
      )}

      {/* Map Display */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm bg-neutral-50 relative z-0">
        <LocationMap 
          value={pos} 
          onPick={(p) => { setPos(p); setSaved(false); }} 
          height={280} 
          radius={pos ? radius : undefined}
        />
      </div>

      {/* Radius Slider */}
      {pos && (
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">
            <span>Delivery Radius</span>
            <span className="text-[#E8A838]  font-bold text-sm lowercase">{radius} km</span>
          </div>
          <input
            type="range"
            min="5"
            max="150"
            step="5"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-[#6B7280]">
            Your catalog will be featured in search results for buyers located within this {radius}km service area.
          </p>
        </div>
      )}

      {/* Footer / Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-neutral-100 justify-between">
        <div className="flex items-center gap-2">
          {pos && (
            <span className="text-xs  text-[#6B7280]">
              GPS: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm font-semibold text-emerald-600 animate-fade-in">✓ Location Saved!</span>}
          <button
            onClick={save}
            disabled={!pos || saving}
            className="rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-6 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {saving ?"Saving Location..." :"Confirm & Save Location"}
          </button>
        </div>
      </div>
    </div>
  );
}