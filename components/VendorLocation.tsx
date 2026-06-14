"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocode";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

const LocationMap = dynamic(() => import("@/components/map/LocationMap"), {
  ssr: false,
  loading: () => <div className="h-80 rounded-xl bg-stone-100 animate-pulse" />,
});

type Pos = { lat: number; lng: number };

export default function VendorLocation() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
    await supabase
      .from("profiles")
      .update({ latitude: pos.lat, longitude: pos.lng })
      .eq("id", user.id);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div>
      <h2 className={`${fraunces.className} text-xl text-stone-900`}>Your location</h2>
      <p className="mt-1 text-sm text-stone-500">
        Search your address, then fine-tune the pin if needed. Buyers will see how far you are.
      </p>

      {/* address search */}
      <div className="mt-4 flex gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") findAddress(); }}
          placeholder="e.g. Galgotias University, Greater Noida"
          className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-stone-900 outline-none focus:border-[#c2410c]"
        />
        <button
          onClick={findAddress}
          disabled={searching || !address.trim()}
          className="rounded-xl bg-[#c2410c] px-5 py-2.5 font-medium text-white hover:bg-[#a8370b] disabled:opacity-50"
        >
          {searching ? "Finding…" : "Find"}
        </button>
      </div>
      {notFound && (
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t find that address. Try being more specific, or click the map directly.</p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
        <LocationMap value={pos} onPick={(p) => { setPos(p); setSaved(false); }} height={260} />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={save}
          disabled={!pos || saving}
          className="rounded-xl bg-[#0c0a09] px-5 py-2.5 font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save location"}
        </button>
        {pos && (
          <span className="text-xs text-stone-400">
            {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
          </span>
        )}
        {saved && <span className="text-sm text-emerald-700">✓ Saved</span>}
      </div>
    </div>
  );
}