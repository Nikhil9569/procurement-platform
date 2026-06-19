"use client";

import { ScoreBreakdown } from"@/lib/scoring";

type VendorCardProps = {
  vendor: {
    id: number;
    vendor_id: string;
    company_name?: string;
    contact_email?: string;
    product_name: string;
    category: string;
    price: number;
    score: number;
    distanceKm?: number | null;
    breakdown?: ScoreBreakdown[];
  };
  onNegotiate: (rfqId?: string) => void;
  onAward: () => void;
};

export default function VendorCard({ vendor, onNegotiate, onAward }: VendorCardProps) {
  const scorePct = Math.round(vendor.score * 100);

  // Score Badge Color mapping
  const getScoreBadgeClass = (score: number) => {
    const s = score * 100;
    if (s >= 80) return"bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]";
    if (s >= 50) return"bg-[#E8A838]/10 border-[#E8A838]/20 text-[#E8A838]";
    return"bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]";
  };

  // Generate dynamic chips
  const getMatchChips = (breakdown?: ScoreBreakdown[]) => {
    if (!breakdown) return ["Verified catalogue"];
    const chips: string[] = [];
    breakdown.forEach(b => {
      if (b.normalisedScore >= 0.8) {
        if (b.factor ==="price") chips.push("Lowest pricing");
        if (b.factor ==="delivery_days") chips.push("Express delivery");
        if (b.factor ==="warranty_months") chips.push("Long warranty");
        if (b.factor ==="rating") chips.push("Client favorite");
      }
    });
    if (chips.length === 0) chips.push("Balanced profile");
    return chips.slice(0, 3);
  };

  const chips = getMatchChips(vendor.breakdown);
  const initials = vendor.company_name?.slice(0, 2).toUpperCase() ||"VE";

  // Generate a random stable color for the avatar circle based on company name
  const getAvatarColor = (name?: string) => {
    if (!name) return"bg-[#0F1E3C] text-white";
    const colors = [
"bg-emerald-50 text-emerald-800 border-emerald-200",
"bg-amber-50 text-amber-800 border-amber-200",
"bg-blue-50 text-blue-800 border-blue-200",
"bg-purple-50 text-purple-800 border-purple-200",
"bg-indigo-50 text-indigo-800 border-indigo-200",
    ];
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code += name.charCodeAt(i);
    }
    return colors[code % colors.length];
  };

  return (
    <div className="group bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-[0_2px_8px_rgba(15,30,60,0.01)] hover:border-[#E8A838]/40 hover:shadow-[0_8px_25px_rgba(232,168,56,0.05)] transition-all flex flex-col justify-between relative">
      
      <div className="space-y-4">
        {/* Top Header: Avatar + Info + Score Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 shrink-0 rounded-full border flex items-center justify-center font-bold text-xs ${getAvatarColor(vendor.company_name)}`}>
              {initials}
            </div>
            <div className="min-w-0 text-left">
              <h4 className="font-semibold text-sm text-[#111827] truncate" title={vendor.company_name}>
                {vendor.company_name ||"Unknown Supplier"}
              </h4>
              <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 border border-[#E5E7EB] text-[10px] font-medium text-[#6B7280] mt-0.5">
                {vendor.category}
              </span>
            </div>
          </div>

          {/* AI Match Score Badge with Hover Tooltip Trigger */}
          <div className="relative group/tooltip">
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-help ${getScoreBadgeClass(vendor.score)}`}>
              {scorePct} match
            </div>

            {/* Hover Tooltip - Slide breakdown */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0F1E3C] text-white p-3.5 rounded-lg shadow-lg z-30 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 text-left space-y-2">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#E8A838] border-b border-white/10 pb-1.5 mb-1.5">
                AI Score Audit
              </h5>
              {vendor.breakdown ? (
                vendor.breakdown.map(b => (
                  <div key={b.factor} className="flex justify-between items-center text-[10px] font-medium">
                    <span className="text-neutral-300">{b.label}</span>
                    <span>{Math.round(b.normalisedScore * 100)}%</span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-neutral-300">Breakdown unavailable</div>
              )}
            </div>
          </div>
        </div>

        {/* Catalog Item + Spec details */}
        <div className="bg-[#F8F7F4]/60 border border-[#E5E7EB]/40 rounded-[8px] p-3 text-left space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6B7280]">Item Offer</span>
            <span className="font-semibold text-[#111827] truncate max-w-[140px]" title={vendor.product_name}>
              {vendor.product_name}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6B7280]">Unit Price</span>
            <span className="font-bold text-[#0F1E3C]">₹{vendor.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#6B7280]">SLA Range</span>
            <span className="font-semibold text-[#111827]">
              {vendor.distanceKm != null ?`${Math.round(vendor.distanceKm)} km` :"No distance"}
            </span>
          </div>
        </div>

        {/* Chips Tags */}
        <div className="flex flex-wrap gap-1.5 text-left">
          {chips.map(c => (
            <span key={c} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-50 text-neutral-500 border border-[#E5E7EB]">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-[#E5E7EB] mt-5">
        <button
          type="button"
          onClick={onAward}
          className="flex-1 h-9 bg-neutral-100 hover:bg-neutral-200 text-[#0F1E3C] text-xs font-bold rounded-[8px] transition-colors cursor-pointer"
        >
          View profile
        </button>
        <button
          type="button"
          onClick={() => onNegotiate()}
          className="flex-1 h-9 bg-[#0F1E3C] hover:bg-[#1A315C] text-white text-xs font-bold rounded-[8px] transition-colors cursor-pointer"
        >
          Start negotiation
        </button>
      </div>

    </div>
  );
}
