"use client";

import { useState, useMemo } from"react";

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
  const [viewMode, setViewMode] = useState<"global" |"category">("global");

  // Get unique categories across all vendors
  const allCategories = useMemo(() => {
    return [...new Set(vendors.flatMap(v => v.categories))].filter(Boolean).sort();
  }, [vendors]);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* View Selector Toggle */}
      <div className="flex bg-neutral-100 p-1 rounded-xl w-fit border border-neutral-200/40">
        <button
          onClick={() => setViewMode("global")}
          className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode ==="global" 
              ?"bg-white text-[#0F1E3C] shadow-sm" 
              :"text-[#6B7280] hover:text-[#0F1E3C]"
          }`}
        >
          Global Top 10
        </button>
        <button
          onClick={() => setViewMode("category")}
          className={`px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            viewMode ==="category" 
              ?"bg-white text-[#0F1E3C] shadow-sm" 
              :"text-[#6B7280] hover:text-[#0F1E3C]"
          }`}
        >
          Top 5 by Category
        </button>
      </div>

      {viewMode ==="global" ? (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)]">
          <VendorTable vendors={vendors.slice(0, 10)} showCategories={true} />
        </div>
      ) : (
        <div className="space-y-8">
          {allCategories.length === 0 ? (
            <div className="text-neutral-500 p-12 text-center bg-white rounded-2xl border border-neutral-200">
              No categories mapped to vendors yet.
            </div>
          ) : (
            allCategories.map(category => {
              const categoryVendors = vendors
                .filter(v => v.categories.includes(category))
                .sort((a, b) => b.finalScore - a.finalScore)
                .slice(0, 5);
                
              return (
                <div key={category} className="space-y-3 animate-fade-in">
                  <h3 className="text-xs font-bold text-[#0F1E3C] uppercase tracking-wider pl-1 flex items-center gap-3">
                    <span className="h-1.5 w-1.5 bg-[#E8A838] rounded-full" />
                    {category}
                    <span className="flex-1 h-px bg-neutral-200" />
                  </h3>
                  <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)]">
                    <VendorTable vendors={categoryVendors} showCategories={false} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component VendorTable
function VendorTable({ vendors, showCategories }: { vendors: VendorScore[], showCategories: boolean }) {
  if (vendors.length === 0) {
    return (
      <div className="p-10 text-center text-neutral-500 text-sm">
        No suppliers ranked in this group.
      </div>
    );
  }

  // Consistent mock location generator based on vendor company name hash
  const getMockLocation = (name: string) => {
    const locations = [
"Pune, India",
"Mumbai, India",
"Greater Noida, India",
"Bangalore, India",
"Gurugram, India",
"Chennai, India"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % locations.length;
    return locations[idx];
  };

  // Border accents for Top 3
  const getLeftBorderAccent = (rank: number) => {
    if (rank === 1) return"border-l-[3.5px] border-[#E8A838]"; // Gold
    if (rank === 2) return"border-l-[3.5px] border-[#9CA3AF]"; // Silver
    if (rank === 3) return"border-l-[3.5px] border-[#CD7F32]"; // Bronze
    return"border-l-[3.5px] border-transparent";
  };

  // Rank badge styling
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return"bg-[#E8A838]/15 text-[#E8A838]";
    if (rank === 2) return"bg-neutral-100 text-[#6B7280]";
    if (rank === 3) return"bg-[#CD7F32]/10 text-[#CD7F32]";
    return"text-neutral-400 bg-neutral-50";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-[#faf8f5] text-neutral-500 border-b border-neutral-200">
          <tr>
            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-20 text-[#0F1E3C]">Rank</th>
            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Vendor Name</th>
            {showCategories && (
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Primary Categories</th>
            )}
            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-36 text-[#0F1E3C]">AI Trust Score</th>
            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-36 text-[#0F1E3C]">Deals Closed</th>
            <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-40 text-[#0F1E3C]">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {vendors.map((v, idx) => {
            const rank = idx + 1;
            const scorePct = Math.round(v.finalScore);
            return (
              <tr 
                key={v.id} 
                className={`transition-colors hover:bg-neutral-50/50 ${getLeftBorderAccent(rank)}`}
              >
                {/* Rank Column */}
                <td className="px-6 py-4.5 font-bold">
                  <div className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center ${getRankBadgeStyle(rank)}`}>
                    {rank}
                  </div>
                </td>

                {/* Vendor Identity */}
                <td className="px-6 py-4.5">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0F1E3C] text-sm">{v.company_name}</span>
                    <span className="text-[10px] text-[#6B7280]  mt-0.5" title={v.contact_email}>
                      {v.contact_email}
                    </span>
                  </div>
                </td>

                {/* Categories */}
                {showCategories && (
                  <td className="px-6 py-4.5">
                    <div className="flex flex-wrap gap-1">
                      {v.categories.slice(0, 2).map(c => (
                        <span key={c} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0F1E3C]/5 text-[#0F1E3C]">
                          {c}
                        </span>
                      ))}
                      {v.categories.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-100 text-[#6B7280]">
                          +{v.categories.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                )}

                {/* AI Trust Score */}
                <td className="px-6 py-4.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E8A838]" style={{ width:`${scorePct}%` }} />
                    </div>
                    <span className="font-bold text-[#0F1E3C]">{scorePct}%</span>
                  </div>
                </td>

                {/* Deals Closed */}
                <td className="px-6 py-4.5 font-bold text-[#0F1E3C]  text-xs">
                  {v.totalOrders} RFQs
                </td>

                {/* Location */}
                <td className="px-6 py-4.5 text-xs text-[#6B7280] font-semibold">
                  {getMockLocation(v.company_name)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
