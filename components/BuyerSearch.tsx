"use client";

import { useState, useEffect } from "react";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import {
  scoreVendors, PRESETS, CatalogItem,
  distinctCategories, productsInCategory,
} from "@/lib/scoring";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

const OPTIONS = [
  { key: "price_critical", label: "Lowest price", desc: "Cost matters most" },
  { key: "fast_delivery", label: "Fast delivery", desc: "I need it quickly" },
  { key: "quality_first", label: "Quality & warranty", desc: "Reliability over price" },
  { key: "balanced", label: "Balanced", desc: "Weigh everything evenly" },
];

export default function BuyerSearch() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [product, setProduct] = useState<string | null>(null);
  const [priority, setPriority] = useState("balanced");
  const [results, setResults] = useState<(CatalogItem & { score: number })[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vendor_catalog")
        .select("id, vendor_id, product_name, category, price, warranty_months, delivery_days, moq");
      setCatalog((data || []) as CatalogItem[]);
    })();
  }, []);

  const categories = distinctCategories(catalog);
  const products = category ? productsInCategory(catalog, category) : [];

  const rank = (prod: string, prio: string) => {
    const matching = catalog.filter((c) => c.product_name === prod);
    setResults(scoreVendors(matching, PRESETS[prio]));
  };

  const pickProduct = (p: string) => { setProduct(p); rank(p, priority); };
  const changePriority = (prio: string) => { setPriority(prio); if (product) rank(product, prio); };
  const backToCategories = () => { setCategory(null); setProduct(null); setResults([]); };
  const backToProducts = () => { setProduct(null); setResults([]); };

  return (
    <div className="max-w-3xl">
      <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Find the right vendor</h1>
      <p className="mt-2 text-stone-500">Pick a category, choose a product, and we'll rank the vendors that sell it.</p>

      {/* STEP 1 — category */}
      {!category && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.length === 0 && (
            <p className="text-sm text-stone-400">No products in the catalogue yet.</p>
          )}
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="rounded-xl border border-stone-300 bg-white p-5 text-left font-medium text-stone-800 transition-all hover:border-[#c2410c] hover:bg-[#fff7f2]"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* STEP 2 — product */}
      {category && !product && (
        <div className="mt-6">
          <button onClick={backToCategories} className="text-sm text-[#c2410c] hover:underline">← Categories</button>
          <p className="mt-3 text-sm font-medium text-stone-600">Products in {category}</p>
          <div className="mt-3 space-y-2">
            {products.map((p) => (
              <button
                key={p}
                onClick={() => pickProduct(p)}
                className="block w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-left text-stone-800 transition-all hover:border-[#c2410c]"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — priorities + ranked vendors */}
      {product && (
        <div className="mt-6">
          <button onClick={backToProducts} className="text-sm text-[#c2410c] hover:underline">← {category}</button>

          <p className="mt-4 text-sm font-medium text-stone-600">What matters most for this purchase?</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => changePriority(o.key)}
                className={`rounded-xl border p-3 text-left transition-all
                  ${priority === o.key ? "border-[#c2410c] bg-[#fff7f2]" : "border-stone-300 bg-white hover:border-stone-400"}`}
              >
                <p className="text-sm font-semibold text-stone-900">{o.label}</p>
                <p className="mt-0.5 text-xs text-stone-500">{o.desc}</p>
              </button>
            ))}
          </div>

          <h2 className={`${fraunces.className} mt-8 text-xl text-stone-900`}>
            {results.length} vendor{results.length !== 1 ? "s" : ""} selling “{product}”
          </h2>
          <div className="mt-4 space-y-3">
            {results.map((r, i) => (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white p-5 ${i === 0 ? "border-[#c2410c] ring-1 ring-[#c2410c]" : "border-stone-200"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    {i === 0 && (
                      <span className="mb-1 inline-block rounded-full bg-[#fff7f2] px-2 py-0.5 text-xs font-medium text-[#c2410c]">
                        Best match
                      </span>
                    )}
                    <h3 className="font-semibold text-stone-900">Vendor {r.vendor_id.slice(0, 8)}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      ₹{r.price}
                      {r.delivery_days ? ` · ${r.delivery_days} day delivery` : ""}
                      {r.warranty_months ? ` · ${r.warranty_months} mo warranty` : ""}
                      {r.moq ? ` · MOQ ${r.moq}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-400">Match score</p>
                    <p className="text-lg font-bold text-[#c2410c]">{(r.score * 100).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}