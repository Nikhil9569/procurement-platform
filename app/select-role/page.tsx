"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocode";

const LocationMap = dynamic(() => import("@/components/map/LocationMap"), {
  ssr: false,
  loading: () => <div className="h-80 rounded-xl bg-neutral-100 animate-pulse" />,
});

type Pos = { lat: number; lng: number };

export default function SelectRole() {
  const [step, setStep] = useState<"role" | "details" | "location">("role");
  const [role, setRole] = useState<"buyer" | "vendor" | null>(null);
  
  // Details
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Location
  const [pos, setPos] = useState<Pos | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState<number>(25);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Prefill details from authenticated user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setContactEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
      }
    })();
  }, [supabase]);

  const pickRole = (r: "buyer" | "vendor") => {
    setRole(r);
    setStep("details");
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Please enter your name."); return; }
    if (role === "vendor" && !companyName.trim()) { setError("Please enter your company name."); return; }
    if (!contactEmail.trim()) { setError("Please enter your email."); return; }
    if (!phoneNumber.trim()) { setError("Please enter your phone number."); return; }
    
    setError("");
    setStep("location");
  };

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

  const save = async () => {
    if (!role) return;
    if (!fullName.trim() || (role === "vendor" && !companyName.trim()) || !contactEmail.trim() || !phoneNumber.trim()) {
      setError("Please fill in all details first.");
      setStep("details");
      return;
    }
    if (role === "buyer" && !pos) {
      setError("Please select a location on the map.");
      return;
    }
    if (role === "vendor" && !address.trim()) {
      setError("Please enter your physical address.");
      return;
    }
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/");

    // Geocode the physical address in the background for vendors
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
        console.error("Geocoding failed for vendor address:", err);
      }
    } else {
      if (!pos) {
        setError("Please select a location on the map.");
        setSaving(false);
        return;
      }
      lat = pos.lat;
      lng = pos.lng;
      savedAddress = searchQuery.trim() || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
    }

    const updateData: any = {
      id: user.id, // required for upsert
      role,
      company_name: role === "vendor" ? companyName.trim() : null,
      contact_email: contactEmail.trim(),
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      latitude: lat,
      longitude: lng,
      address: savedAddress,
      service_radius: role === "vendor" ? radius : null,
      email: user.email // sync primary auth email
    };

    const { error: dbErr } = await supabase
      .from("profiles")
      .upsert(updateData);

    if (dbErr) {
      setError(dbErr.message);
      setSaving(false);
      return;
    }
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 relative">
      {/* Background grid */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <svg className="absolute inset-0 w-full h-full stroke-neutral-300/60 [mask-image:radial-gradient(60%_60%_at_50%_50%,white,transparent)]" aria-hidden="true">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M.5 40V.5H40" fill="none" strokeWidth="0.5" strokeDasharray="2 2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        {/* App Logo */}
        <div className="mb-12 flex flex-col items-center">
          <span className="text-sm font-bold tracking-[0.2em] text-[#0F1E3C]">
            PROCURE<span className="text-[#E8A838]">·</span>AI
          </span>
        </div>

        <div className="w-full text-center animate-fade-up">
          {step === "role" && (
            <>
              <h1 className="text-3xl sm:text-4xl text-[#0F1E3C] tracking-tight">
                How will you use the platform?
              </h1>
              <p className="mt-3 text-sm text-[#6B7280] max-w-md mx-auto">
                Select your role to start registration. This will customize your default workspace interface.
              </p>
              <div className="mt-10 grid sm:grid-cols-2 gap-6 w-full text-left">
                <RoleCard
                  title="I'm a Buyer"
                  desc="Upload RFQs, search and compare vendor catalogues, and get AI recommendations."
                  icon={<BuyerIcon />}
                  onClick={() => pickRole("buyer")}
                />
                <RoleCard
                  title="I'm a Vendor"
                  desc="Upload product catalogues, specify service areas, and participate in deals."
                  icon={<VendorIcon />}
                  onClick={() => pickRole("vendor")}
                />
              </div>
            </>
          )}

          {step === "details" && (
            <div className="w-full max-w-md mx-auto bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_8px_30px_rgb(15,30,60,0.02)] text-left">
              <button
                onClick={() => { setStep("role"); setError(""); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280] hover:text-[#0F1E3C] transition-colors mb-6 cursor-pointer"
              >
                &larr; Back to role selection
              </button>
              <h2 className="text-2xl font-bold text-[#0F1E3C] tracking-tight">
                Sign Up Details
              </h2>
              <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">
                Tell us about yourself and your organization to complete registration.
              </p>

              <form onSubmit={handleDetailsSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(""); }}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400"
                  />
                </div>

                {role === "vendor" && (
                  <div>
                    <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">
                      Company / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => { setCompanyName(e.target.value); setError(""); }}
                      placeholder="e.g. Apex Industrial Supplies"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => { setContactEmail(e.target.value); setError(""); }}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setError(""); }}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400"
                  />
                </div>

                {error && <p className="text-xs font-medium text-red-600 animate-fade-in">{error}</p>}

                <button
                  type="submit"
                  className="mt-6 w-full rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-5 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.99] cursor-pointer text-center"
                >
                  Continue to Location →
                </button>
              </form>
            </div>
          )}

          {step === "location" && (
            <div className="w-full max-w-xl mx-auto bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_8px_30px_rgb(15,30,60,0.02)] text-left">
              <button
                onClick={() => { setStep("details"); setError(""); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280] hover:text-[#0F1E3C] transition-colors mb-6 cursor-pointer"
              >
                &larr; Back to profile details
              </button>
              
              <h2 className="text-2xl font-bold text-[#0F1E3C] tracking-tight">
                {role === "vendor" ? "Physical Location & Radius" : "Primary Delivery Destination"}
              </h2>
              <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">
                {role === "vendor" 
                  ? "Provide your main business location address and maximum delivery radius."
                  : "Search for your primary office or delivery destination address."}
              </p>

              <div className="mt-6 space-y-4">
                
                {role === "buyer" && (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") findAddress(); }}
                        placeholder="e.g. Connaught Place, New Delhi"
                        className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400"
                      />
                      <button
                        onClick={findAddress}
                        disabled={searching || !searchQuery.trim()}
                        className="rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {searching ? "Finding..." : "Find"}
                      </button>
                    </div>

                    {notFound && (
                      <p className="text-xs font-semibold text-red-600 animate-fade-in">
                        We couldn't locate that address. Try typing a city, or click directly on the map.
                      </p>
                    )}

                    <div className="overflow-hidden rounded-xl border border-neutral-200 shadow-sm bg-neutral-50 relative z-0">
                      <LocationMap 
                        value={pos} 
                        onPick={(p) => { setPos(p); setError(""); }} 
                        height={250}
                      />
                    </div>
                  </>
                )}

                {role === "vendor" && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">
                        Physical / Manual Address
                      </label>
                      <textarea
                        required
                        value={address}
                        onChange={(e) => { setAddress(e.target.value); setError(""); }}
                        placeholder="Enter full physical address (e.g. Floor 2, Building 3, Connaught Place, New Delhi)"
                        rows={3}
                        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-[#111827] outline-none focus:border-[#0F1E3C] focus:ring-2 focus:ring-[#0F1E3C]/10 transition-all placeholder:text-neutral-400 resize-none"
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

                {error && <p className="text-xs font-medium text-red-600 animate-fade-in">{error}</p>}

                <div className="flex items-center justify-end pt-4 border-t border-neutral-100">
                  <button
                    onClick={save}
                    disabled={saving || (role === "buyer" && !pos) || (role === "vendor" && !address.trim())}
                    className="rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-6 py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Creating Account..." : "Complete Sign Up →"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function RoleCard({ title, desc, icon, onClick }: {
  title: string; desc: string; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl border border-neutral-200 p-8 text-left transition-all hover:border-[#E8A838] hover:shadow-[0_8px_30px_rgb(232,168,56,0.06)] active:scale-[0.99] cursor-pointer flex flex-col justify-between h-full"
    >
      <div>
        <div className="h-12 w-12 rounded-xl bg-[#0F1E3C]/5 text-[#0F1E3C] flex items-center justify-center transition-colors group-hover:bg-[#E8A838]/10 group-hover:text-[#E8A838] mb-6">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-[#0F1E3C] group-hover:text-[#E8A838] transition-colors">{title}</h3>
        <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">{desc}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-[#0F1E3C] group-hover:translate-x-1 transition-transform">
        Choose Role &rarr;
      </span>
    </button>
  );
}

function BuyerIcon() {
  return (
    <svg className="w-6 h-6 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      <path d="M12 7v6m-3-3h6" />
    </svg>
  );
}

function VendorIcon() {
  return (
    <svg className="w-6 h-6 stroke-current" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}