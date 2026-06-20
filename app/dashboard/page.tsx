"use client";

import { useState, useEffect, useMemo } from"react";
import { createClient } from"@/lib/supabase/client";
import { useRouter } from"next/navigation";
import { scoreVendors, PRESETS, CatalogItem } from"@/lib/scoring";
import { haversineKm } from"@/lib/distance";

// Vendor Dashboard Workflow
import VendorDashboard from"@/components/VendorDashboard";

// Buyer Redesigned Components
import VendorSearchForm from"@/components/buyer/VendorSearchForm";
import ScoringWeights from"@/components/buyer/ScoringWeights";
import DeliveryDestination from"@/components/buyer/DeliveryDestination";
import VendorResultsGrid from"@/components/buyer/VendorResultsGrid";

type Pos = { lat: number; lng: number };

export default function Dashboard() {
  const [profile, setProfile] = useState<{ role: string; company_name: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Shared Sourcing State managed in page.tsx
  const [mode, setMode] = useState<'catalog' |'semantic'>('catalog');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [volume, setVolume] = useState('');
  const [sla, setSla] = useState('');
  const [weightPreset, setWeightPreset] = useState<'balanced' |'price' |'speed' |'custom'>('balanced');
  const [weights, setWeights] = useState({ price: 33, proximity: 33, speed: 34 });
  const [destination, setDestination] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [radius, setRadius] = useState(50);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Catalog metadata for exact filters
  const [catalogMeta, setCatalogMeta] = useState<{product_name: string, category: string, stock: number | null}[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role, company_name")
        .eq("id", user.id)
        .single();
      
      if (!data?.role) {
        router.push("/select-role");
        return;
      }
      setProfile(data);
      setLoadingProfile(false);

      // Load catalog info
      const { data: catalog } = await supabase.from("vendor_catalog").select("product_name, category, stock");
      if (catalog) {
        setCatalogMeta(catalog as {product_name: string, category: string, stock: number | null}[]);
      }
    })();
  }, [supabase, router]);

  const categories = useMemo(() => {
    return Array.from(new Set(catalogMeta.map((d) => d.category))).filter(Boolean).sort();
  }, [catalogMeta]);

  const availableProducts = useMemo(() => {
    if (!category) return [];
    return Array.from(new Set(catalogMeta.filter(d => d.category === category).map((d) => d.product_name))).sort();
  }, [catalogMeta, category]);

  const handleSearch = async (overrideParams?: {
    mode?:'catalog' |'semantic';
    category?: string;
    volume?: string;
    destination?: string;
    coords?: Pos;
  }) => {
    setLoading(true);
    setResults([]);

    const activeMode = overrideParams?.mode ?? mode;
    const activeItem = item;
    const activeVolume = overrideParams?.volume ?? volume;
    const activeCoords = overrideParams?.coords ?? coords;

    try {
      let valid: CatalogItem[] = [];
      if (activeMode ==="catalog") {
        const { data: catalogData } = await supabase
          .from("vendor_catalog")
          .select("id, vendor_id, product_name, category, price, warranty_months, delivery_days, moq, stock")
          .eq("product_name", activeItem);
        valid = (catalogData || []) as CatalogItem[];
      } else {
        // Semantic Sourcing Mode
        const res = await fetch("/api/embed", {
          method:"POST",
          headers: {"Content-Type":"application/json" },
          body: JSON.stringify({ texts: [destination] }) // Use destination/semantic query
        });
        const data = await res.json();
        if (data.embeddings && data.embeddings.length > 0) {
          const { data: rpcData, error: rpcErr } = await supabase.rpc("match_products", {
            query_embedding:`[${data.embeddings[0].join(',')}]`,
            match_threshold: 0.5,
            match_count: 50
          });
          if (!rpcErr) {
            valid = (rpcData || []) as CatalogItem[];
          }
        }
      }

      // Volume SLA constraints filtering
      valid = valid.filter((c) => {
        if (activeVolume && c.moq && Number(activeVolume) < c.moq) return false;
        if (activeVolume && c.stock && Number(activeVolume) > c.stock) return false;
        if (sla && c.delivery_days && c.delivery_days > Number(sla)) return false;
        return true;
      });

      // Vendor details profiles
      const vendorIds = [...new Set(valid.map(c => c.vendor_id))];
      const companyMap: Record<string, {name: string, email: string}> = {};
      const coordMap: Record<string, Pos> = {};
      if (vendorIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, company_name, contact_email, latitude, longitude")
          .in("id", vendorIds);
        if (profileData) {
          profileData.forEach(p => {
            if (p.company_name) companyMap[p.id] = { name: p.company_name, email: p.contact_email };
            if (p.latitude != null && p.longitude != null) {
              coordMap[p.id] = { lat: p.latitude, lng: p.longitude };
            }
          });
        }
      }

      // Convert manual sliders to weights structure
      const totalWeight = weights.price + weights.speed + 50;
      const activeWeights = {
        price: weights.price / totalWeight,
        delivery_days: weights.speed / totalWeight,
        warranty_months: 25 / totalWeight,
        rating: 25 / totalWeight,
      };

      let ranked = scoreVendors(valid, activeWeights).map((r) => {
        const vendorPos = coordMap[r.vendor_id];
        const distanceKm = activeCoords && vendorPos ? haversineKm(activeCoords, vendorPos) : null;
        return {
          ...r,
          company_name: companyMap[r.vendor_id]?.name ||`Vendor ${r.vendor_id.slice(0, 8)}`,
          contact_email: companyMap[r.vendor_id]?.email,
          distanceKm,
          vendorPos,
        };
      });

      // Max Distance slider filter
      if (radius < 500) {
        ranked = ranked.filter(r => r.distanceKm == null || r.distanceKm <= radius);
      }

      setResults(ranked);
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Pre-fill fields for preset queries
  const handleTryPreset = async (cat: string, vol: string, dest?: string) => {
    setMode("catalog");
    setCategory(cat);
    setVolume(vol);

    // Pick first matching item in that category for convenience
    const matchingItem = catalogMeta.find(d => d.category === cat);
    if (matchingItem) {
      setItem(matchingItem.product_name);
    }

    let activeCoords = coords;
    if (dest) {
      setDestination(dest);
      if (dest.toLowerCase().includes("mumbai")) {
        const mumbaiPos = { lat: 19.0760, lng: 72.8777 };
        setBuyerPos(mumbaiPos);
        activeCoords = mumbaiPos;
      }
    }

    // Trigger instant matching
    setTimeout(async () => {
      await handleSearch({
        mode:"catalog",
        category: cat,
        volume: vol,
        destination: dest,
        coords: activeCoords || undefined
      });
    }, 100);
  };

  const setBuyerPos = (p: Pos) => {
    setCoords(p);
  };

  const handleNegotiate = async (vendorId: string, companyName: string, selectedProduct: string, selectedPrice: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let savedAmount = 0;
    if (results && results.length > 1 && volume) {
      const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
      if (avgPrice > selectedPrice) {
        savedAmount = (avgPrice - selectedPrice) * Number(volume);
      }
    }

    const { data: newRfq } = await supabase.from("rfq_history").insert({
      buyer_id: user.id,
      vendor_id: vendorId,
      product_name: selectedProduct,
      quantity: Number(volume) || 1,
      price_per_unit: selectedPrice,
      saved_amount: savedAmount,
      priority: weightPreset,
      experience_rating: null,
      feedback_notes: null
    }).select().single();

    if (newRfq?.id) {
      router.push(`/dashboard/deals/${newRfq.id}`);
    } else {
      router.push("/dashboard/deals");
    }
  };

  const handleAward = async (vendorId: string, companyName: string, selectedProduct: string, selectedPrice: number) => {
    setFeedbackModal({ vendorId, companyName, product: selectedProduct, price: selectedPrice });
    setFeedbackRating(0);
    setFeedbackNotes("");
  };

  const saveAwardRating = async () => {
    if (!feedbackModal) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let savedAmount = 0;
    if (results && results.length > 1 && volume) {
      const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
      if (avgPrice > feedbackModal.price) {
        savedAmount = (avgPrice - feedbackModal.price) * Number(volume);
      }
    }

    const { data: newRfq } = await supabase.from("rfq_history").insert({
      buyer_id: user.id,
      vendor_id: feedbackModal.vendorId,
      product_name: feedbackModal.product,
      quantity: Number(volume) || 1,
      price_per_unit: feedbackModal.price,
      saved_amount: savedAmount,
      priority: weightPreset,
      experience_rating: feedbackRating || null,
      feedback_notes: feedbackNotes || null
    }).select().single();

    setFeedbackModal(null);
    if (newRfq?.id) {
      router.push(`/dashboard/deals/${newRfq.id}`);
    } else {
      router.push("/dashboard/deals");
    }
  };

  const [selectedVendorProfile, setSelectedVendorProfile] = useState<any | null>(null);
  const [loadingProfileDetails, setLoadingProfileDetails] = useState(false);

  const handleViewProfile = async (vendorId: string) => {
    setLoadingProfileDetails(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("company_name, contact_email, full_name, phone_number, address, service_radius")
      .eq("id", vendorId)
      .single();
      
    setLoadingProfileDetails(false);
    if (!error && data) {
      setSelectedVendorProfile(data);
    } else {
      console.error("Error fetching vendor profile:", error);
    }
  };

  const [feedbackModal, setFeedbackModal] = useState<{vendorId: string, companyName: string, product: string, price: number} | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");

  if (loadingProfile) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-[#F8F7F4]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-10 w-10 rounded-full border-4 border-neutral-200 border-t-[#0F1E3C] animate-spin" />
          <span className="text-xs text-[#6B7280] font-semibold">Loading dashboard profile...</span>
        </div>
      </div>
    );
  }

  // Render Vendor Flow
  if (profile?.role ==="vendor") {
    return <VendorDashboard />;
  }

  return (
    <div className="w-full h-auto md:h-[calc(100vh-64px)] grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto md:overflow-hidden text-left bg-[#F8F7F4] min-w-0">
      
      {/* Left Column (scrollable on desktop) */}
      <div className="h-auto md:h-full overflow-y-auto pr-1 space-y-4 scrollbar-thin">
        
        {/* Card 1: Find Vendors */}
        <VendorSearchForm
          mode={mode}
          setMode={setMode}
          category={category}
          setCategory={setCategory}
          categories={categories}
          item={item}
          setItem={setItem}
          items={availableProducts}
          volume={volume}
          setVolume={setVolume}
          sla={sla}
          setSla={setSla}
          onSearch={handleSearch}
          loading={loading}
        />

        {/* Card 2: Scoring Weights */}
        <ScoringWeights
          weightPreset={weightPreset}
          setWeightPreset={setWeightPreset}
          weights={weights}
          setWeights={setWeights}
        />

        {/* Card 3: Delivery Location */}
        <DeliveryDestination
          coords={coords}
          setCoords={setBuyerPos}
          destination={destination}
          setDestination={setDestination}
          radius={radius}
          setRadius={setRadius}
        />
      </div>

      {/* Right Column (1fr fills remaining width) */}
      <div className="h-auto md:h-full overflow-y-auto pl-1 min-w-0">
        <VendorResultsGrid
          vendors={results || []}
          loading={loading}
          hasSearched={results !== null}
          onNegotiate={handleNegotiate}
          onViewProfile={handleViewProfile}
          onTryPreset={handleTryPreset}
        />
      </div>

      {/* Feedback rating award popup */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[10px] p-8 max-w-md w-full shadow-2xl animate-fade-up flex flex-col relative text-left" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#0F1E3C] tracking-tight mb-2">Finalize Proposal Award</h3>
            <p className="text-neutral-500 text-xs leading-relaxed mb-6">
              You are awarding this bid to <strong className="text-[#0F1E3C]">{feedbackModal.companyName}</strong>. Rate the expected transaction experience to help our matching index.
            </p>
            
            <div className="flex items-center gap-2 mb-6 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className={`text-4xl transition-transform hover:scale-110 cursor-pointer ${feedbackRating >= star ?'text-[#E8A838]' :'text-neutral-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={feedbackNotes}
              onChange={e => setFeedbackNotes(e.target.value)}
              placeholder="Any specific concessions? (Optional)"
              className="w-full rounded-[8px] border border-neutral-300 p-3.5 bg-white text-xs outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] min-h-[100px] resize-y mb-6 text-[#111827]"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveAwardRating}
                className="flex-1 px-4 py-3 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-[8px] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Skip & Create Deal
              </button>
              <button
                type="button"
                onClick={saveAwardRating}
                disabled={feedbackRating === 0}
                className="flex-1 px-4 py-3 text-xs font-bold text-white bg-[#0F1E3C] rounded-[8px] hover:bg-[#1A315C] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Submit & Create Deal
              </button>
            </div>
            <button onClick={() => setFeedbackModal(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-[#0F1E3C] cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading Profile Overlay */}
      {loadingProfileDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/20 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
            <span className="flex h-6 w-6 rounded-full border-2 border-neutral-200 border-t-[#0F1E3C] animate-spin" />
            <span className="text-xs font-semibold text-[#0F1E3C]">Fetching profile...</span>
          </div>
        </div>
      )}

      {/* Vendor Profile Modal */}
      {selectedVendorProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-up flex flex-col relative text-left" onClick={(e) => e.stopPropagation()}>
            
            {/* Close button */}
            <button 
              onClick={() => setSelectedVendorProfile(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-[#0F1E3C] transition-colors text-xl font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-neutral-100 mb-6">
              <div className="h-12 w-12 rounded-full bg-[#0F1E3C] text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
                {(selectedVendorProfile.company_name || "VE").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F1E3C] leading-tight">
                  {selectedVendorProfile.company_name || "Vendor Partner"}
                </h3>
                <span className="text-[10px] font-bold text-[#E8A838] uppercase tracking-wider">
                  Verified Supplier Profile
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Contact Person</span>
                <p className="text-xs font-semibold text-[#0F1E3C]">
                  {selectedVendorProfile.full_name || "N/A"}
                </p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Email Address</span>
                <p className="text-xs font-semibold text-[#0F1E3C]">
                  {selectedVendorProfile.contact_email || "N/A"}
                </p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Phone Number</span>
                <p className="text-xs font-semibold text-[#0F1E3C]">
                  {selectedVendorProfile.phone_number || "N/A"}
                </p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Physical Address</span>
                <p className="text-xs font-medium text-neutral-600 leading-relaxed bg-[#faf8f5] p-3 rounded-lg border border-neutral-100">
                  {selectedVendorProfile.address || "No physical address configured."}
                </p>
              </div>

              {selectedVendorProfile.service_radius !== undefined && selectedVendorProfile.service_radius !== null && (
                <div>
                  <span className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Delivery SLA / Radius</span>
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-2 py-1 rounded w-fit">
                    Up to {selectedVendorProfile.service_radius} km coverage
                  </p>
                </div>
              )}
            </div>

            {/* Footer Close Button */}
            <div className="mt-8 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSelectedVendorProfile(null)}
                className="w-full py-3 text-xs font-bold text-white bg-[#0F1E3C] hover:bg-[#1a2f5e] rounded-xl transition-colors cursor-pointer text-center"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}