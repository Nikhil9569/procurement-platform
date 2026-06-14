"use client";

import { useState } from "react";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

export type VendorScore = {
  id: string;
  company_name: string;
  contact_email: string;
  categories: string[];
  avgCatalogRating: number;
  avgExpRating: number;
  totalOrders: number;
  finalScore: number;
};

export default function LeaderboardView({ vendors }: { vendors: VendorScore[] }) {
  const [viewMode, setViewMode] = useState<"global" | "category">("global");

  // Get unique categories across all vendors
  const allCategories = [...new Set(vendors.flatMap(v => v.categories))];

  return (
    <div className="flex flex-col gap-8">
      {/* Toggle */}
      <div className="flex bg-stone-200/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode("global")}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
            viewMode === "global" 
              ? "bg-white text-stone-900 shadow-sm" 
              : "text-stone-500 hover:text-stone-700 hover:bg-white/50"
          }`}
        >
          Global Top 10
        </button>
        <button
          onClick={() => setViewMode("category")}
          className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
            viewMode === "category" 
              ? "bg-white text-stone-900 shadow-sm" 
              : "text-stone-500 hover:text-stone-700 hover:bg-white/50"
          }`}
        >
          Top 5 by Category
        </button>
      </div>

      {viewMode === "global" ? (
        <VendorList vendors={vendors.slice(0, 10)} showCategories={true} />
      ) : (
        <div className="space-y-12">
          {allCategories.length === 0 && (
            <div className="text-stone-500 p-8 text-center bg-white rounded-2xl border border-stone-200">
              No categories found.
            </div>
          )}
          {allCategories.map(category => {
            const categoryVendors = vendors
              .filter(v => v.categories.includes(category))
              .sort((a, b) => b.finalScore - a.finalScore)
              .slice(0, 5);
              
            return (
              <div key={category} className="animate-[fadeIn_0.3s_ease-out]">
                <h2 className={`${fraunces.className} text-xl text-[#c2410c] mb-4 flex items-center gap-2`}>
                  <span className="w-8 h-px bg-[#c2410c]/30"></span>
                  {category}
                  <span className="flex-1 h-px bg-stone-200"></span>
                </h2>
                <VendorList vendors={categoryVendors} showCategories={false} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VendorList({ vendors, showCategories }: { vendors: VendorScore[], showCategories: boolean }) {
  if (vendors.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500">
        No vendors ranked yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vendors.map((v, index) => (
        <div key={v.id} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          {/* Rank Badge */}
          <div className={`absolute top-0 right-0 w-16 h-16 flex items-start justify-end p-4 font-bold text-lg rounded-bl-3xl ${
            index === 0 ? 'bg-amber-100 text-amber-700' :
            index === 1 ? 'bg-stone-200 text-stone-700' :
            index === 2 ? 'bg-orange-100 text-orange-800' :
            'bg-stone-50 text-stone-400'
          }`}>
            #{index + 1}
          </div>

          <h3 className="font-bold text-lg text-stone-900 pr-12">{v.company_name}</h3>
          <p className="text-sm text-stone-500 mb-4">{v.contact_email}</p>

          <div className="flex items-end gap-3 mb-6">
            <span className={`${fraunces.className} text-4xl text-[#c2410c]`}>{v.finalScore}</span>
            <span className="text-stone-400 text-sm mb-1 font-medium">/100 Score</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Buyer Rating</span>
              <span className="font-medium text-stone-900">
                {v.avgExpRating > 0 ? `${v.avgExpRating.toFixed(1)} ★` : 'No data'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Product Quality</span>
              <span className="font-medium text-stone-900">
                {v.avgCatalogRating > 0 ? `${v.avgCatalogRating.toFixed(1)} ★` : 'No data'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Orders Fulfilled</span>
              <span className="font-medium text-stone-900">{v.totalOrders}</span>
            </div>
          </div>

          {showCategories && v.categories.length > 0 && (
            <div className="mt-6 pt-4 border-t border-stone-100">
              <div className="flex flex-wrap gap-2">
                {v.categories.slice(0, 3).map(c => (
                  <span key={c} className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs">
                    {c}
                  </span>
                ))}
                {v.categories.length > 3 && (
                  <span className="px-2 py-1 bg-stone-50 text-stone-400 rounded text-xs">
                    +{v.categories.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
