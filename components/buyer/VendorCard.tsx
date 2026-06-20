"use client";

import { ScoreBreakdown } from "@/lib/scoring";

type Pos = { lat: number; lng: number };

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
    vendorPos?: Pos | null;
  };
  onNegotiate: () => void;
  onViewProfile: () => void;
};

export default function VendorCard({ vendor, onNegotiate, onViewProfile }: VendorCardProps) {
  const scorePct = Math.round(vendor.score * 100);

  // Score Badge Color mapping based on score
  const getScoreBadgeClass = (score: number) => {
    const s = score * 100;
    if (s >= 80) return "bg-green-50 text-green-800 border-green-200";
    if (s >= 50) return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-red-50 text-red-800 border-red-200";
  };

  // Generate dynamic chips (keywords)
  const getMatchChips = (breakdown?: ScoreBreakdown[], companyName?: string) => {
    const chips: string[] = [];
    if (breakdown) {
      breakdown.forEach(b => {
        if (b.normalisedScore >= 0.8) {
          if (b.factor === "price") chips.push("bulk pricing");
          if (b.factor === "delivery_days") chips.push("fast delivery");
          if (b.factor === "warranty_months") chips.push("ISO certified");
          if (b.factor === "rating") chips.push("high rating");
        }
      });
    }
    
    // Add location-based keyword if applicable
    if (companyName && companyName.toLowerCase().includes("mumbai")) {
      chips.push("Mumbai");
    } else if (vendor.distanceKm && vendor.distanceKm < 20) {
      chips.push("local supplier");
    }

    // Fallbacks if not enough tags
    if (chips.length === 0) chips.push("ISO certified");
    if (chips.length < 2) chips.push("bulk pricing");
    if (chips.length < 3) chips.push("mumbai");
    
    return chips.slice(0, 3);
  };

  const chips = getMatchChips(vendor.breakdown, vendor.company_name);
  const initials = vendor.company_name?.slice(0, 2).toUpperCase() || "VE";

  // Generate a stable color bg based on company name hash
  const getAvatarColor = (name?: string) => {
    if (!name) return "bg-[#0F1E3C] text-white";
    const colors = [
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-rose-100 text-rose-800 border-rose-200",
    ];
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code += name.charCodeAt(i);
    }
    return colors[code % colors.length];
  };

  // Build Hover breakdown details string
  const getBreakdownString = () => {
    if (!vendor.breakdown) return "Matching criteria balanced";
    
    const priceFactor = vendor.breakdown.find(b => b.factor === "price");
    const speedFactor = vendor.breakdown.find(b => b.factor === "delivery_days");
    const ratingFactor = vendor.breakdown.find(b => b.factor === "rating");

    const pScore = priceFactor ? Math.round(priceFactor.normalisedScore * 100) : 80;
    const sScore = speedFactor ? Math.round(speedFactor.normalisedScore * 100) : 75;
    const rScore = ratingFactor ? Math.round(ratingFactor.normalisedScore * 100) : 85;

    return `Price ${pScore}% · Proximity ${rScore}% · Speed ${sScore}%`;
  };

  return (
    <div className="group bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-md transition-all flex flex-col justify-between relative text-left">
      
      <div className="space-y-4">
        {/* Header: Avatar, Name & Category, Score Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 shrink-0 rounded-full border flex items-center justify-center font-bold text-sm ${getAvatarColor(vendor.company_name)}`}>
              {initials}
            </div>
            <div className="min-w-0 text-left">
              <h4 className="font-medium text-[15px] text-gray-900 leading-snug truncate" title={vendor.company_name}>
                {vendor.company_name || "Unknown Vendor"}
              </h4>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-medium text-gray-500 mt-1">
                {vendor.category}
              </span>
            </div>
          </div>

          {/* AI Score Badge with Tooltip on hover */}
          <div className="relative group/tooltip">
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-help ${getScoreBadgeClass(vendor.score)}`}>
              {scorePct} match
            </div>

            {/* Hover Tooltip */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0F1E3C] text-white p-3.5 rounded-lg shadow-lg z-30 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 text-left space-y-2">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#E8A838] border-b border-white/10 pb-1.5 mb-1.5">
                AI Score Audit
              </h5>
              <div className="text-[11px] font-medium text-neutral-200 leading-relaxed">
                {getBreakdownString()}
              </div>
            </div>
          </div>
        </div>

        {/* Spec details: Product item, price, distance */}
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Item offer</span>
            <span className="font-semibold text-gray-900 truncate max-w-[150px]" title={vendor.product_name}>
              {vendor.product_name}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Unit price</span>
            <span className="font-bold text-[#0F1E3C]">₹{vendor.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Proximity / Distance info */}
        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
          <svg className="w-3.5 h-3.5 text-gray-400 stroke-current fill-none shrink-0" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>
            {vendor.distanceKm != null ? `${Math.round(vendor.distanceKm)} km away` : "Distance unknown"}
          </span>
        </div>

        {/* 3 Keyword chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 border border-gray-100 text-gray-500 uppercase tracking-wide">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Actions: View Profile + Negotiate */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-5">
        <button
          type="button"
          onClick={onViewProfile}
          className="flex-1 h-9 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer text-center"
        >
          View profile
        </button>
        <button
          type="button"
          onClick={onNegotiate}
          className="flex-1 h-9 bg-[#0F1E3C] hover:bg-[#1a2f5e] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer text-center"
        >
          Negotiate
        </button>
      </div>

    </div>
  );
}
