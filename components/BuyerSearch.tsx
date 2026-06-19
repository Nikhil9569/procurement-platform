"use client";

import { useState, useEffect, useMemo } from"react";
import { createClient } from"@/lib/supabase/client";
import { scoreVendors, PRESETS, CatalogItem, ScoreBreakdown } from"@/lib/scoring";
import { haversineKm } from"@/lib/distance";
import { useRouter } from"next/navigation";

// Modular Subcomponents
import VendorSearchForm from"./VendorSearchForm";
import ActiveConstraints from"./ActiveConstraints";
import DeliveryDestination from"./DeliveryDestination";
import VendorResultsGrid from"./VendorResultsGrid";

type Pos = { lat: number; lng: number };

type EnhancedVendor = CatalogItem & {
  score: number;
  company_name?: string;
  contact_email?: string;
  breakdown?: ScoreBreakdown[];
  distanceKm?: number | null;
  vendorPos?: Pos | null;
};

export default function BuyerSearch() {
  const [catalogMeta, setCatalogMeta] = useState<{product_name: string, category: string, stock: number | null}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});

  const [product, setProduct] = useState<string>("");
  const [priority, setPriority] = useState("balanced");
  const [quantity, setQuantity] = useState<number | "">("");
  const [deadline, setDeadline] = useState<number | "">("");

  const [searchMode, setSearchMode] = useState<"exact" | "smart">("exact");
  const [smartQuery, setSmartQuery] = useState("");
  const [savingRfq, setSavingRfq] = useState<string | null>(null);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<EnhancedVendor[]>([]);
  
  // Scoring Sliders State
  const [priceWeight, setPriceWeight] = useState(33);
  const [proximityWeight, setProximityWeight] = useState(33);
  const [deliveryWeight, setDeliveryWeight] = useState(34);

  // Delivery destination location state
  const [buyerPos, setBuyerPos] = useState<Pos | null>(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [maxDistance, setMaxDistance] = useState<number>(500); // 500 ="Any"

  const [awardedRfq, setAwardedRfq] = useState<string | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<{vendorId: string, companyName: string, product: string, price: number} | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");

  const [briefLoading, setBriefLoading] = useState(false);
  const [negotiationBrief, setNegotiationBrief] = useState<string[]>([]);

  const supabase = useMemo(() => createClient(), []);

  // Fetch unique catalogue metadata on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("vendor_catalog").select("product_name, category, stock");
      if (data) {
        setCatalogMeta(data as {product_name: string, category: string, stock: number | null}[]);
      }
    })();
  }, [supabase]);

  const categories = useMemo(() => Array.from(new Set(catalogMeta.map((d) => d.category))).filter(Boolean).sort(), [catalogMeta]);
  const availableProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return Array.from(new Set(catalogMeta.filter(d => d.category === selectedCategory).map((d) => d.product_name))).sort();
  }, [catalogMeta, selectedCategory]);

  const maxStock = useMemo(() => {
    if (!product) return null;
    const matching = catalogMeta.filter(c => c.product_name === product && c.stock != null);
    if (matching.length === 0) return null;
    return Math.max(...matching.map(m => m.stock!));
  }, [product, catalogMeta]);

  const overStockLimit = maxStock !== null && quantity !== "" && Number(quantity) > maxStock;

  const search = async () => {
    if (searchMode === "exact" && (!product || overStockLimit)) return;
    if (searchMode === "smart" && !smartQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setSearchError(null);
    setResults([]);

    let valid: CatalogItem[] = [];

    if (activeSearchMode ==="catalog") {
      const activeProduct = product;
      const { data: catalogData, error: catalogErr } = await supabase
        .from("vendor_catalog")
        .select("id, vendor_id, product_name, category, price, warranty_months, delivery_days, moq, stock")
        .eq("product_name", activeProduct);

      if (catalogErr) {
        console.error("Catalog fetch error:", catalogErr);
        setSearchError("Failed to fetch products. Please try again.");
        setLoading(false);
        return;
      }
      valid = (catalogData || []) as CatalogItem[];
    } else {
      try {
        const res = await fetch("/api/embed", {
          method:"POST",
          headers: {"Content-Type":"application/json" },
          body: JSON.stringify({ texts: [activeSmartQuery] })
        });
        const data = await res.json();
        if (data.embeddings && data.embeddings.length > 0) {
          const { data: rpcData, error: rpcErr } = await supabase.rpc("match_products", {
            query_embedding:`[${data.embeddings[0].join(',')}]`,
            match_threshold: 0.5,
            match_count: 50
          });
          if (rpcErr) throw rpcErr;
          valid = (rpcData || []) as CatalogItem[];
        }
      } catch(e) {
        console.error("Smart search error:", e);
        setSearchError("Smart search failed. Please try again.");
        setLoading(false);
        return;
      }
    }

    const vendorIds = [...new Set(valid.map(c => c.vendor_id))];
    const newMap: Record<string, {name: string, email: string}> = {};
    const coordMap: Record<string, Pos> = {};
    if (vendorIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, company_name, contact_email, latitude, longitude")
        .in("id", vendorIds);
      if (profileData) {
        profileData.forEach(p => {
          if (p.company_name) newMap[p.id] = { name: p.company_name, email: p.contact_email };
          if (p.latitude != null && p.longitude != null) {
            coordMap[p.id] = { lat: p.latitude, lng: p.longitude };
          }
        });
      }
    }

    valid = valid.filter((c) => {
      if (activeQuantity && c.moq && activeQuantity < c.moq) return false;
      if (activeQuantity && c.stock && activeQuantity > c.stock) return false;
      if (deadline && c.delivery_days && c.delivery_days > deadline) return false;
      return true;
    });

    // Scoring weights presets mapping
    let customWeights = PRESETS[priority] || PRESETS.balanced;
    if (priority ==="custom") {
      const sum = priceWeight + deliveryWeight + 50; // Baseline rating/warranty constants
      customWeights = {
        price: priceWeight / sum,
        delivery_days: deliveryWeight / sum,
        warranty_months: 25 / sum,
        rating: 25 / sum,
      };
    }

    // Apply ranking calculations & proximity calculations
    let ranked = scoreVendors(valid, customWeights).map((r) => {
      const vendorPos = coordMap[r.vendor_id];
      const distanceKm = activeBuyerPos && vendorPos ? haversineKm(activeBuyerPos, vendorPos) : null;
      return {
        ...r,
        company_name: newMap[r.vendor_id]?.name ||`Vendor ${r.vendor_id.slice(0, 8)}`,
        contact_email: newMap[r.vendor_id]?.email,
        distanceKm,
        vendorPos,
      };
    });

    // Filter by max distance radius (if not"Any" which is 500)
    if (maxDistance < 500) {
      ranked = ranked.filter(r => r.distanceKm == null || r.distanceKm <= maxDistance);
    }

  const getSavings = () => {
    if (results.length < 2 || !quantity) return null;
    const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
    const bestPrice = results[0].price;
    if (bestPrice >= avgPrice) return null;
    const saved = (avgPrice - bestPrice) * Number(quantity);
    return Math.round(saved);
  };

  // Quick preset query handler
  const handleTryPreset = async () => {
    setSearchMode("semantic");
    setSmartQuery("Office supplies");
    setQuantity(500);
    setLocationAddress("Mumbai, India");
    const mumbaiPos = { lat: 19.0760, lng: 72.8777 };
    setBuyerPos(mumbaiPos);

    // Trigger search instantly
    await search({
      searchMode:"semantic",
      smartQuery:"Office supplies",
      quantity: 500,
      locationAddress:"Mumbai, India",
      buyerPos: mumbaiPos
    });
  };

  const handleNegotiate = async (vendorId: string, companyName: string, selectedProduct: string, selectedPrice: number) => {
    setSavingRfq(vendorId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let savedAmount = 0;
    if (results.length > 1 && quantity) {
      const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
      if (avgPrice > selectedPrice) {
        savedAmount = (avgPrice - selectedPrice) * Number(quantity);
      }
    }

    const { data: newRfq } = await supabase.from("rfq_history").insert({
      buyer_id: user.id,
      vendor_id: vendorId,
      product_name: searchMode ==="semantic" ? smartQuery : selectedProduct,
      quantity: Number(quantity) || 1,
      price_per_unit: selectedPrice,
      saved_amount: savedAmount,
      priority,
      experience_rating: null,
      feedback_notes: null
    }).select().single();

    setAwardedRfq(vendorId);
    setSavingRfq(null);

    setTimeout(() => {
      if (newRfq?.id) {
        router.push(`/dashboard/deals/${newRfq.id}`);
      } else {
        router.push("/dashboard/deals");
      }
    }, 1000);
  };

  if (catalogMeta.length === 0) {
    return (
      <div className="max-w-6xl w-full flex flex-col items-center justify-center gap-4 py-20 text-center animate-[fadeUp_0.4s_ease-out_both]">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-3xl mb-2">📦</div>
        <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Catalogue is empty</h1>
        <p className="text-stone-500 max-w-md">No vendors have listed products yet. Check back soon or invite vendors to upload their brochures.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-full flex flex-col gap-8 animate-[fadeUp_0.4s_ease-out_both]">

      <div className="mb-2">
        <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Find the right vendor</h1>
        <p className="mt-2 text-stone-500">Pick what you need, and we&apos;ll rank the vendors that sell it.</p>
      </div>

      {/* RFQ Builder Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm animate-[fadeUp_0.3s_ease-out_both]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className={`${fraunces.className} text-xl text-stone-900`}>Create Request for Quote (RFQ)</h2>
          <div className="flex bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchMode("exact")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchMode === "exact" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Exact Product
            </button>
            <button
              onClick={() => setSearchMode("smart")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchMode === "smart" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Smart Search ✨
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="col-span-1 md:col-span-3">
            {searchMode === "exact" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
                  <select
                    value={selectedCategory || ""}
                    onChange={(e) => { setSelectedCategory(e.target.value); setProduct(""); }}
                    className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-900 outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
                  >
                    <option value="" disabled>Select a category...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">What do you need?</label>
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    disabled={!selectedCategory}
                    className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-900 outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c] disabled:opacity-50"
                  >
                    <option value="" disabled>{selectedCategory ? "Select a product..." : "Pick a category first..."}</option>
                    {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium text-stone-700 mb-2">Describe what you need (AI Search)</label>
                <input
                  type="text"
                  value={smartQuery}
                  onChange={(e) => setSmartQuery(e.target.value)}
                  placeholder="e.g., high performance laptop for 4k video editing"
                  className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-900 outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
                />
              </>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-stone-700 mb-2">Quantity Needed</label>
            {overStockLimit && (
              <div className="absolute -top-14 left-0 z-10 w-full rounded-lg bg-red-100 px-3 py-2 text-xs font-medium text-red-800 shadow-sm border border-red-200 animate-[fadeUp_0.2s_ease-out_both]">
                Max available quantity is {maxStock}
                <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-red-100 border-r border-b border-red-200 rotate-45"></div>
              </div>
            )}
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g. 50"
              className={`w-full rounded-xl border p-3 bg-white text-stone-900 outline-none focus:ring-1 transition-colors ${
                overStockLimit ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50' : 'border-stone-300 focus:border-[#c2410c] focus:ring-[#c2410c]'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Max Delivery Deadline (days)</label>
            <input
              type="number"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value ? Number(e.target.value) : "")}
              placeholder="Optional"
              className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-900 outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
            />
          </div>

          <div className="col-span-1 md:col-span-3 mt-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">What matters most?</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setPriority(o.key)}
                  className={`rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                    priority === o.key ? "border-[#c2410c] bg-[#fff7f2] shadow-[0_0_0_1px_#c2410c]" : "border-stone-300 bg-white hover:border-stone-400"
                  }`}
                >
                  <p className="text-sm font-semibold text-stone-900">{o.label}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-3 mt-4">
            <label className="block text-sm font-medium text-stone-700 mb-2">Your location (optional — to see distance)</label>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddressSearch(); }}
                placeholder="e.g. Connaught Place, Delhi"
                className="flex-1 rounded-xl border border-stone-300 px-4 py-3 bg-white text-stone-900 outline-none focus:border-[#c2410c] focus:ring-2 focus:ring-[#c2410c]/10 transition-all"
              />
              <button
                onClick={handleAddressSearch}
                disabled={locationSearching || !locationAddress.trim()}
                className="px-6 py-3 bg-[#e8a28e] text-white font-medium rounded-xl hover:bg-[#d68c76] transition-colors disabled:opacity-50"
              >
                {locationSearching ? "..." : "Find"}
              </button>
            </div>
            <div className="w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm">
              <LocationMap
                value={buyerPos}
                vendorPos={results.length > 0 && hasSearched ? results[0].vendorPos : null}
                onPick={(p) => setBuyerPos(p)}
                height={220}
              />
            </div>
            {buyerPos && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <span>📍</span> Location set. Distance will be calculated.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={search}
          disabled={(searchMode === "exact" && (!product || overStockLimit)) || (searchMode === "smart" && !smartQuery) || loading}
          className="mt-8 w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#0c0a09] text-stone-50 font-medium transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (<><svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Finding vendors...</>) : "Compare Vendors"}
        </button>
      </div>

      {/* Top Product Card */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm relative overflow-hidden animate-[fadeUp_0.35s_ease-out_both]">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🏆</div>
          <h3 className="text-sm font-medium text-emerald-800 mb-2">Top Recommended Product</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className={`${fraunces.className} text-2xl text-emerald-950`}>{results[0].product_name}</p>
              <p className="text-emerald-700 mt-1 font-medium">Offered by {results[0].company_name || "Vendor"}</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/60 px-4 py-2 rounded-lg border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium">Price</p>
                <p className="text-lg font-semibold text-emerald-900">₹{results[0].price.toLocaleString()}</p>
              </div>
              <div className="bg-white/60 px-4 py-2 rounded-lg border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium">Match</p>
                <p className="text-lg font-semibold text-emerald-900">{Math.round(results[0].score)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skeleton Loader */}
      {loading && hasSearched && (
        <div className="animate-[fadeUp_0.3s_ease-out_both]">
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
              <span className="text-[#c2410c] text-lg animate-pulse">✨</span>
              <span className="text-sm font-medium text-stone-600 animate-pulse">Agent is comparing vendors...</span>
            </div>
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-200 animate-pulse"></div>
                  <div className="h-4 flex-1 bg-stone-100 rounded animate-pulse" style={{ animationDelay: `${row * 120}ms` }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* Results Section */}
      {hasSearched && !loading && (
        <div className="flex flex-col xl:flex-row gap-6 animate-[fadeUp_0.4s_ease-out_both]">
          <div className="flex-1 rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm flex flex-col">
            <div className="p-5 sm:p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50">
              <h2 className={`${fraunces.className} text-lg sm:text-xl text-stone-900`}>
                Vendor Comparison for &ldquo;{searchMode === "smart" ? smartQuery : product}&rdquo;
              </h2>
              {savings !== null && savings > 0 && (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium border border-emerald-200/50 shadow-sm self-start sm:self-auto">
                  Potential Savings: ₹{savings.toLocaleString()}
                </span>
              )}
            </div>

            {searchError ? (
              <div className="p-8 text-center text-red-600">{searchError}</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                No vendors found matching your criteria. Try adjusting the quantity or deadline.
              </div>
            ) : (
              <>
                {/* DESKTOP: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-stone-50/50 text-stone-500 border-b border-stone-200">
                      <tr>
                        <th className="px-6 py-4 font-medium min-w-[200px]">Vendor</th>
                        <th className="px-6 py-4 font-medium w-32">Match Score</th>
                        <th className="px-6 py-4 font-medium w-32">Price (₹)</th>
                        <th className="px-6 py-4 font-medium w-32">Delivery</th>
                        <th className="px-6 py-4 font-medium w-32">Warranty</th>
                        <th className="px-6 py-4 font-medium w-32">MOQ</th>
                        <th className="px-6 py-4 font-medium w-32">Stock</th>
                        <th className="px-6 py-4 font-medium w-32">Rating</th>
                        <th className="px-6 py-4 font-medium w-32">Distance</th>
                        <th className="px-6 py-4 font-medium w-32 text-right sticky right-0 bg-stone-50/95 backdrop-blur-sm shadow-[-8px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-stone-100 z-10">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {results.map((r, i) => (
                        <tr key={r.id} className={`transition-colors hover:bg-stone-50/50 ${i === 0 ? 'bg-[#fff7f2]/50' : 'bg-white'}`}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2.5">
                              {i === 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#c2410c] shadow-[0_0_0_4px_#fff7f2]" title="Top Match" />}
                              <span className={`font-semibold ${i === 0 ? 'text-[#c2410c]' : 'text-stone-900'}`}>{r.company_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 font-bold text-stone-900">
                            <button
                              onClick={() => setAuditVendorId(auditVendorId === r.vendor_id ? null : r.vendor_id)}
                              className="flex items-center gap-2 group cursor-pointer hover:text-[#c2410c] transition-colors"
                              title="Click to view scoring breakdown"
                            >
                              <div className="h-1.5 w-12 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#c2410c]" style={{ width: `${r.score * 100}%` }} />
                              </div>
                              {(r.score * 100).toFixed(0)}
                              <svg className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#c2410c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          </td>
                          <td className="px-6 py-5 text-stone-800">₹{r.price.toLocaleString()}</td>
                          <td className="px-6 py-5 text-stone-600">{r.delivery_days ? `${r.delivery_days} days` : '—'}</td>
                          <td className="px-6 py-5 text-stone-600">{r.warranty_months ? `${r.warranty_months} mo` : '—'}</td>
                          <td className="px-6 py-5 text-stone-600">{r.moq ?? '—'}</td>
                          <td className="px-6 py-5 text-stone-600">{r.stock ?? '—'}</td>
                          <td className="px-6 py-5 text-stone-600">{r.rating ? <span className="flex items-center gap-1"><span className="text-amber-500">★</span>{r.rating}</span> : '—'}</td>
                          <td className="px-6 py-5 text-stone-600">{r.distanceKm != null ? `≈ ${Math.round(r.distanceKm)} km` : '—'}</td>
                          <td className={`px-6 py-5 text-right sticky right-0 shadow-[-8px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-stone-100/50 ${i === 0 ? 'bg-[#fff7f2]' : 'bg-white'}`}>
                            <button
                              onClick={() => { setFeedbackModal({ vendorId: r.vendor_id, companyName: r.company_name || "Vendor", product: r.product_name, price: r.price }); setFeedbackRating(0); setFeedbackNotes(""); }}
                              disabled={savingRfq === r.vendor_id || awardedRfq === r.vendor_id}
                              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${awardedRfq === r.vendor_id ? "bg-emerald-600 text-white" : "bg-stone-900 text-white hover:bg-[#c2410c]"}`}
                            >
                              {awardedRfq === r.vendor_id ? "Awarded ✓" : savingRfq === r.vendor_id ? "Saving..." : "Award"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE: stacked cards */}
                <div className="md:hidden divide-y divide-stone-100">
                  {results.map((r, i) => (
                    <div key={r.id} className={`p-5 ${i === 0 ? 'bg-[#fff7f2]/50' : 'bg-white'}`}>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {i === 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#c2410c] shrink-0" title="Top Match" />}
                          <span className={`font-semibold truncate ${i === 0 ? 'text-[#c2410c]' : 'text-stone-900'}`}>{r.company_name}</span>
                        </div>
                        <button
                          onClick={() => setAuditVendorId(auditVendorId === r.vendor_id ? null : r.vendor_id)}
                          className="flex items-center gap-1.5 shrink-0 text-sm font-bold text-stone-900"
                        >
                          <span className="text-[#c2410c]">{(r.score * 100).toFixed(0)}</span>
                          <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-stone-400">Price</span><span className="text-stone-800 font-medium">₹{r.price.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-stone-400">Delivery</span><span className="text-stone-700">{r.delivery_days ? `${r.delivery_days}d` : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-stone-400">Warranty</span><span className="text-stone-700">{r.warranty_months ? `${r.warranty_months}mo` : '—'}</span></div>
                        <div className="flex justify-between"><span className="text-stone-400">MOQ</span><span className="text-stone-700">{r.moq ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-stone-400">Stock</span><span className="text-stone-700">{r.stock ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-stone-400">Distance</span><span className="text-stone-700">{r.distanceKm != null ? `≈${Math.round(r.distanceKm)}km` : '—'}</span></div>
                      </div>
                      <button
                        onClick={() => { setFeedbackModal({ vendorId: r.vendor_id, companyName: r.company_name || "Vendor", product: r.product_name, price: r.price }); setFeedbackRating(0); setFeedbackNotes(""); }}
                        disabled={savingRfq === r.vendor_id || awardedRfq === r.vendor_id}
                        className={`mt-4 w-full py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${awardedRfq === r.vendor_id ? "bg-emerald-600 text-white" : "bg-stone-900 text-white hover:bg-[#c2410c]"}`}
                      >
                        {awardedRfq === r.vendor_id ? "Awarded ✓" : savingRfq === r.vendor_id ? "Saving..." : "Award"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* AI Negotiation Brief */}
          {results.length > 0 && (
            <div className="w-full xl:w-80 shrink-0 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm h-fit">
              <h3 className="flex items-center gap-2 font-semibold text-stone-900 mb-5 pb-4 border-b border-stone-100">
                <span className="text-[#c2410c] text-lg">✨</span> Negotiation Strategy
              </h3>
              {briefLoading ? (
                <div className="space-y-4 animate-pulse mt-2">
                  <div className="h-2 bg-stone-100 rounded w-full"></div>
                  <div className="h-2 bg-stone-100 rounded w-5/6"></div>
                  <div className="h-2 bg-stone-100 rounded w-4/6"></div>
                </div>
              ) : negotiationBrief.length > 0 ? (
                <ul className="space-y-4">
                  {negotiationBrief.map((point, i) => (
                    <li key={i} className="text-sm text-stone-600 flex items-start gap-3 leading-relaxed">
                      <span className="text-[#c2410c] mt-0.5 shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500 text-center py-4">Strategy not available.</p>
              )}
            </div>
          )}

          {/* Dynamic Grid Results */}
          <VendorResultsGrid
            vendors={results}
            loading={loading}
            hasSearched={hasSearched}
            onNegotiate={handleNegotiate}
            onAward={handleAward}
            onTryQuery={handleTryPreset}
          />
        </div>
      )}

      {/* Audit Breakdown Modal */}
      {auditVendorId && (() => {
        const vendor = results.find(r => r.vendor_id === auditVendorId);
        if (!vendor || !vendor.breakdown) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAuditVendorId(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out_both]" />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-[fadeUp_0.25s_ease-out_both]" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
                <div>
                  <h3 className={`${fraunces.className} text-lg text-stone-900`}>Scoring Breakdown</h3>
                  <p className="text-sm text-stone-500 mt-1">
                    {vendor.company_name} {vendor.contact_email && <span className="text-stone-400 ml-1">({vendor.contact_email})</span>}
                  </p>
                </div>
                <button onClick={() => setAuditVendorId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-200 transition-colors text-stone-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {vendor.breakdown.map((b) => {
                  const pct = Math.round(b.normalisedScore * 100);
                  const weightPct = Math.round(b.weight * 100);
                  return (
                    <div key={b.factor}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-900">{b.label}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{weightPct}% weight</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-stone-900">{pct}</span>
                          <span className="text-xs text-stone-400">/100</span>
                          {b.rawValue !== null && (
                            <span className="text-xs text-stone-400 ml-2">
                              (raw: {b.factor === 'price' ? `₹${b.rawValue.toLocaleString()}` : b.factor === 'delivery_days' ? `${b.rawValue}d` : b.factor === 'warranty_months' ? `${b.rawValue}mo` : b.rawValue})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626' }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-4 mt-4 border-t border-stone-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">Final Weighted Score</span>
                  <span className={`${fraunces.className} text-2xl text-stone-900`}>{Math.round(vendor.score * 100)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl animate-[fadeUp_0.3s_ease-out_both] flex flex-col relative">
            <h3 className={`${fraunces.className} text-2xl text-stone-900 mb-2`}>Rate Vendor</h3>
            <p className="text-stone-500 text-sm mb-6">You are awarding this RFQ to <strong>{feedbackModal.companyName}</strong>. Please rate your expected experience to help us improve future matches.</p>
            <div className="flex items-center gap-2 mb-6 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setFeedbackRating(star)} className={`text-4xl transition-transform hover:scale-110 ${feedbackRating >= star ? 'text-amber-400' : 'text-stone-200'}`}>★</button>
              ))}
            </div>
            <textarea
              value={feedbackNotes}
              onChange={e => setFeedbackNotes(e.target.value)}
              placeholder="Any specific reasons for choosing this vendor? (Optional)"
              className="w-full rounded-xl border border-stone-300 p-3 bg-white text-stone-900 outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c] min-h-[100px] resize-y mb-6 text-sm"
            />
            <div className="flex gap-3 mt-auto">
              <button onClick={() => saveRfq(feedbackModal.vendorId, feedbackModal.companyName, feedbackModal.product, feedbackModal.price)} className="flex-1 px-4 py-3 text-sm font-medium text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors">
                Skip & Save
              </button>
              <button onClick={() => saveRfq(feedbackModal.vendorId, feedbackModal.companyName, feedbackModal.product, feedbackModal.price, feedbackRating, feedbackNotes)} disabled={feedbackRating === 0} className="flex-1 px-4 py-3 text-sm font-medium text-white bg-[#c2410c] rounded-xl hover:bg-[#9a3412] transition-colors disabled:opacity-50">
                Submit & Save
              </button>
            </div>
            <button onClick={() => setFeedbackModal(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-[#0F1E3C] cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}