"use client";

import { useState, useEffect, useMemo } from "react";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import { scoreVendors, PRESETS, CatalogItem } from "@/lib/scoring";
import { useRouter } from "next/navigation";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

const OPTIONS = [
  { key: "price_critical", label: "Lowest price", desc: "Cost matters most" },
  { key: "fast_delivery", label: "Fast delivery", desc: "I need it quickly" },
  { key: "quality_first", label: "Quality & warranty", desc: "Reliability over price" },
  { key: "balanced", label: "Balanced", desc: "Weigh everything evenly" },
];

export default function BuyerSearch() {
  const [catalogMeta, setCatalogMeta] = useState<{product_name: string, category: string, stock: number | null}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Map of vendor_id → company_name for display
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
  const [results, setResults] = useState<(CatalogItem & { score: number, company_name?: string })[]>([]);
  
  const [briefLoading, setBriefLoading] = useState(false);
  const [negotiationBrief, setNegotiationBrief] = useState<string[]>([]);

  const supabase = useMemo(() => createClient(), []);

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
    if (matching.length === 0) return null; // No stock data available
    return Math.max(...matching.map(m => m.stock!));
  }, [product, catalogMeta]);

  const overStockLimit = maxStock !== null && quantity !== "" && Number(quantity) > maxStock;

  const search = async () => {
    if (searchMode === "exact" && (!product || overStockLimit)) return;
    if (searchMode === "smart" && !smartQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setNegotiationBrief([]);
    setResults([]);

    let valid: CatalogItem[] = [];

    if (searchMode === "exact") {
      const { data: catalogData, error: catalogErr } = await supabase
        .from("vendor_catalog")
        .select("id, vendor_id, product_name, category, price, warranty_months, delivery_days, moq, stock")
        .eq("product_name", product);

      if (catalogErr) { console.error("Catalog fetch error:", catalogErr); setLoading(false); return; }
      valid = (catalogData || []) as CatalogItem[];
    } else {
      try {
        const res = await fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: [smartQuery] })
        });
        const data = await res.json();
        if (data.embeddings && data.embeddings.length > 0) {
          const { data: rpcData, error: rpcErr } = await supabase.rpc("match_products", {
            query_embedding: `[${data.embeddings[0].join(',')}]`,
            match_threshold: 0.5,
            match_count: 50
          });
          if (rpcErr) throw rpcErr;
          valid = (rpcData || []) as CatalogItem[];
        }
      } catch(e) {
        console.error("Smart search error:", e);
        setLoading(false);
        return;
      }
    }

    // Step 2: fetch company names separately for the vendor_ids we found
    const vendorIds = [...new Set(valid.map(c => c.vendor_id))];
    const newMap: Record<string, string> = {};
    if (vendorIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, company_name")
        .in("id", vendorIds);
      if (profileData) {
        profileData.forEach(p => { if (p.company_name) newMap[p.id] = p.company_name; });
      }
    }

    // Filter by quantity and deadline
    valid = valid.filter((c) => {
      if (quantity && c.moq && quantity < c.moq) return false;
      if (quantity && c.stock && quantity > c.stock) return false;
      if (deadline && c.delivery_days && c.delivery_days > deadline) return false;
      return true;
    });

    const ranked = scoreVendors(valid, PRESETS[priority]).map((r) => ({
      ...r,
      company_name: newMap[r.vendor_id] || `Vendor ${r.vendor_id.slice(0, 8)}`,
    }));
    setResults(ranked);

    if (ranked.length > 0) {
      setBriefLoading(true);
      try {
        const res = await fetch("/api/negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priority,
            vendors: ranked.slice(0, 3).map(r => ({
              company: r.company_name,
              price: r.price,
              delivery: r.delivery_days,
              warranty: r.warranty_months,
              score: r.score,
            }))
          }),
        });
        const briefData = await res.json();
        if (briefData.bullets) setNegotiationBrief(briefData.bullets);
      } catch (e) {
        console.error("Failed to load brief", e);
      }
      setBriefLoading(false);
    }
    setLoading(false);
  };

  const getSavings = () => {
    if (results.length < 2 || !quantity) return null;
    const bestPrice = results[0].price;
    const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
    if (avgPrice <= bestPrice) return null;
    const saved = (avgPrice - bestPrice) * Number(quantity);
    return Math.round(saved);
  };

  const savings = getSavings();

  const saveRfq = async (vendorId: string, companyName: string, selectedProduct: string, selectedPrice: number) => {
    setSavingRfq(vendorId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Recalculate savings specifically for the chosen row vs the average
    let savedAmount = 0;
    if (results.length > 1 && quantity) {
      const avgPrice = results.reduce((acc, r) => acc + r.price, 0) / results.length;
      if (avgPrice > selectedPrice) {
        savedAmount = (avgPrice - selectedPrice) * Number(quantity);
      }
    }

    await supabase.from("rfq_history").insert({
      buyer_id: user.id,
      vendor_id: vendorId,
      product_name: searchMode === "smart" ? smartQuery : selectedProduct,
      quantity: Number(quantity) || 1,
      price_per_unit: selectedPrice,
      saved_amount: savedAmount,
      priority
    });
    router.push("/dashboard/history");
  };

  return (
    <div className="max-w-6xl w-full flex flex-col gap-8 animate-[fadeUp_0.4s_ease-out_both]">
      
      {/* Category Selection Step */}
      <div className="mb-2">
        <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Find the right vendor</h1>
        <p className="mt-2 text-stone-500">Pick a category, choose a product, and we&apos;ll rank the vendors that sell it.</p>
        
        {categories.length > 0 && (
          <div className="mt-6 flex overflow-x-auto pb-4 gap-3 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedCategory(c);
                  setProduct("");
                }}
                className={`snap-start shrink-0 rounded-xl border p-4 text-left font-medium transition-all active:scale-[0.98] ${
                  selectedCategory === c 
                    ? "border-[#c2410c] bg-[#fff7f2] shadow-[0_0_0_1px_#c2410c] text-stone-900" 
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                }`}
              >
                <div className="text-sm tracking-wide uppercase">{c}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RFQ Builder Form */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm animate-[fadeUp_0.3s_ease-out_both]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className={`${fraunces.className} text-xl text-stone-900`}>Create Request for Quote (RFQ)</h2>
          <div className="flex bg-stone-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchMode("exact")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchMode === "exact" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Exact Product
            </button>
            <button
              onClick={() => setSearchMode("smart")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${searchMode === "smart" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >
              Smart Search ✨
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="col-span-1 md:col-span-3">
            {searchMode === "exact" ? (
              <>
                <label className="block text-sm font-medium text-stone-700 mb-2">What do you need?</label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full rounded-xl border border-stone-300 p-3 bg-white outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c] disabled:opacity-50"
                >
                  <option value="" disabled>{selectedCategory ? "Select a product..." : "Pick a category first..."}</option>
                  {availableProducts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-stone-700 mb-2">Describe what you need (AI Search)</label>
                <input
                  type="text"
                  value={smartQuery}
                  onChange={(e) => setSmartQuery(e.target.value)}
                  placeholder="e.g., high performance laptop for 4k video editing"
                  className="w-full rounded-xl border border-stone-300 p-3 bg-white outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
                />
              </>
            )}
          </div>

            <div className="relative">
              <label className="block text-sm font-medium text-stone-700 mb-2">Quantity Needed</label>
              
              {/* Max Quantity Popup */}
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
                className={`w-full rounded-xl border p-3 bg-white outline-none focus:ring-1 transition-colors ${
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
                className="w-full rounded-xl border border-stone-300 p-3 bg-white outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
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
          </div>

          <button
            onClick={search}
            disabled={(searchMode === "exact" && (!product || overStockLimit)) || (searchMode === "smart" && !smartQuery) || loading}
            className="mt-8 w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#0c0a09] text-stone-50 font-medium transition-all hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? "Finding vendors..." : "Compare Vendors"}
          </button>
        </div>

      {/* Top Product Card */}
      {hasSearched && !loading && results.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm relative overflow-hidden animate-[fadeUp_0.35s_ease-out_both]">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🏆</div>
          <h3 className="text-sm font-medium text-emerald-800 mb-2">Top Recommended Product</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className={`${fraunces.className} text-2xl text-emerald-950`}>
                {results[0].product_name}
              </p>
              <p className="text-emerald-700 mt-1 font-medium">
                Offered by {results[0].company_name || "Vendor"}
              </p>
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

      {/* Results Section */}
      {hasSearched && !loading && (
        <div className="flex flex-col xl:flex-row gap-6 animate-[fadeUp_0.4s_ease-out_both]">
          <div className="flex-1 rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm flex flex-col">
            <div className="p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50">
              <h2 className={`${fraunces.className} text-xl text-stone-900`}>
                Vendor Comparison for &ldquo;{product}&rdquo;
              </h2>
              {savings !== null && savings > 0 && (
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium border border-emerald-200/50 shadow-sm">
                  Potential Savings: ₹{savings.toLocaleString()}
                </span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                No vendors found matching your criteria. Try adjusting the quantity or deadline.
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      <th className="px-6 py-4 font-medium w-32 text-right sticky right-0 bg-stone-50/95 backdrop-blur-sm shadow-[-8px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-stone-100 z-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {results.map((r, i) => (
                      <tr key={r.id} className={`transition-colors hover:bg-stone-50/50 ${i === 0 ? 'bg-[#fff7f2]/50' : 'bg-white'}`}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2.5">
                            {i === 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#c2410c] shadow-[0_0_0_4px_#fff7f2]" title="Top Match" />}
                            <span className={`font-semibold ${i === 0 ? 'text-[#c2410c]' : 'text-stone-900'}`}>
                              {r.company_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-stone-900">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#c2410c]" style={{ width: `${r.score * 100}%` }} />
                            </div>
                            {(r.score * 100).toFixed(0)}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-stone-800">₹{r.price.toLocaleString()}</td>
                        <td className="px-6 py-5 text-stone-600">{r.delivery_days ? `${r.delivery_days} days` : '—'}</td>
                        <td className="px-6 py-5 text-stone-600">{r.warranty_months ? `${r.warranty_months} mo` : '—'}</td>
                        <td className="px-6 py-5 text-stone-600">{r.moq ?? '—'}</td>
                        <td className="px-6 py-5 text-stone-600">{r.stock ?? '—'}</td>
                        <td className={`px-6 py-5 text-right sticky right-0 shadow-[-8px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-stone-100/50 ${i === 0 ? 'bg-[#fff7f2]' : 'bg-white'}`}>
                          <button
                            onClick={() => saveRfq(r.vendor_id, r.company_name || "Vendor", r.product_name, r.price)}
                            disabled={savingRfq === r.vendor_id}
                            className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-[#c2410c] transition-colors disabled:opacity-50"
                          >
                            {savingRfq === r.vendor_id ? "Saving..." : "Award"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  <div className="pt-2">
                    <div className="h-2 bg-stone-100 rounded w-full"></div>
                    <div className="h-2 bg-stone-100 rounded w-5/6 mt-4"></div>
                  </div>
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
                <p className="text-sm text-stone-500 text-center py-4">Generating strategy...</p>
              )}
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes fadeUp { from {opacity:0;transform:translateY(12px)} to {opacity:1;transform:translateY(0)} }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}