"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocode";

const LocationMap = dynamic(() => import("@/components/map/LocationMap"), {
  ssr: false,
  loading: () => <div className="h-80 rounded-xl bg-neutral-100 animate-pulse" />,
});

type Pos = { lat: number; lng: number };

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile Fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Location fields
  const [pos, setPos] = useState<Pos | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState<number>(25);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [role, setRole] = useState<string>("");

  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, contact_email, full_name, phone_number, address, role, service_radius, latitude, longitude")
        .eq("id", user.id)
        .single();

      if (data) {
        setCompanyName(data.company_name || "");
        setContactEmail(data.contact_email || "");
        setFullName(data.full_name || "");
        setPhoneNumber(data.phone_number || "");
        setRole(data.role || "");
        
        if (data.role === "vendor") {
          setAddress(data.address || "");
        } else {
          setSearchQuery(data.address || "");
        }

        if (data.service_radius != null) setRadius(Number(data.service_radius));
        if (data.latitude != null && data.longitude != null) {
          setPos({ lat: data.latitude, lng: data.longitude });
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const findAddress = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setNotFound(false);
    const result = await geocodeAddress(searchQuery);
    setSearching(false);
    if (result) {
      setPos(result);
    } else {
      setNotFound(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!fullName.trim() || (role === "vendor" && !companyName.trim()) || !contactEmail.trim() || !phoneNumber.trim()) {
      setMessage({ type: "error", text: "Please fill in all required details." });
      setSaving(false);
      return;
    }

    if (role === "buyer" && !pos) {
      setMessage({ type: "error", text: "Please select a location on the map." });
      setSaving(false);
      return;
    }

    if (role === "vendor" && !address.trim()) {
      setMessage({ type: "error", text: "Please enter your physical address." });
      setSaving(false);
      return;
    }

    let lat = null;
    let lng = null;
    let savedAddress = "";

    if (role === "vendor") {
      savedAddress = address.trim();
      try {
        const coords = await geocodeAddress(savedAddress);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch (err) {
        console.error("Geocoding address failed:", err);
      }
    } else {
      if (pos) {
        lat = pos.lat;
        lng = pos.lng;
        savedAddress = searchQuery.trim() || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
      }
    }

    const updateData: any = {
      company_name: role === "vendor" ? companyName.trim() : null,
      contact_email: contactEmail.trim(),
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      address: savedAddress,
      latitude: lat,
      longitude: lng,
    };

    if (role === "vendor") {
      updateData.service_radius = radius;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully!" });
    }
    setSaving(false);
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto animate-fade-up pb-16">
      <div className="mb-8 text-left">
        <h1 className="text-3xl text-[#0F1E3C] tracking-tight">Your Profile</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Manage your personal information, company details, and location service area.</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-[0_8px_30px_rgb(15,30,60,0.02)]">
        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-10 bg-neutral-100 rounded-xl w-full"></div>
              <div className="h-10 bg-neutral-100 rounded-xl w-full"></div>
              <div className="h-10 bg-neutral-100 rounded-xl w-full"></div>
              <div className="h-10 bg-neutral-100 rounded-xl w-full"></div>
            </div>
            <div className="h-20 bg-neutral-100 rounded-xl w-full"></div>
            <div className="h-12 bg-neutral-200 rounded-xl w-32 mt-6"></div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 bg-white"
                />
              </div>

              {/* Company Name (Vendors Only) */}
              {role === "vendor" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">Company / Business Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 bg-white"
                  />
                </div>
              )}

              {/* Contact Email */}
              <div className={role === "vendor" ? "" : "md:col-span-2"}>
                <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">Contact Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 bg-white"
                />
              </div>

              {/* Phone Number */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 bg-white"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="pt-6 border-t border-neutral-200 space-y-4">
              <h3 className="text-lg font-bold text-[#0F1E3C]">
                {role === "vendor" ? "Service Location & Delivery Area" : "Primary Office / Delivery Location"}
              </h3>
              <p className="text-[#6B7280] text-xs">
                {role === "vendor" 
                  ? "Update your primary branch or warehouse physical address and service delivery radius."
                  : "Update your default delivery address or office location."}
              </p>

              <div className="space-y-4">
                
                {role === "buyer" && (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findAddress(); } }}
                        placeholder="e.g. Connaught Place, New Delhi"
                        className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 bg-white"
                      />
                      <button
                        type="button"
                        onClick={findAddress}
                        disabled={searching || !searchQuery.trim()}
                        className="rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {searching ? "Finding..." : "Find"}
                      </button>
                    </div>

                    {notFound && (
                      <p className="text-xs font-semibold text-red-600">
                        We couldn't locate that address. Try typing a city, or click directly on the map.
                      </p>
                    )}

                    <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm bg-neutral-50 relative z-0">
                      <LocationMap 
                        value={pos} 
                        onPick={(p) => setPos(p)} 
                        height={280}
                      />
                    </div>
                  </>
                )}

                {role === "vendor" && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">Physical Address</label>
                      <textarea
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter full physical address (e.g. Floor 2, Building 3, Connaught Place, New Delhi)"
                        rows={3}
                        className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 bg-white resize-none"
                      />
                    </div>

                    <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">
                        <span>Delivery Radius</span>
                        <span className="text-[#E8A838] font-bold text-sm lowercase">{radius} km</span>
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
                    </div>
                  </>
                )}
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className="flex items-center justify-end pt-6 border-t border-neutral-200">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3.5 bg-[#0F1E3C] hover:bg-[#1A315C] text-white font-semibold rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
