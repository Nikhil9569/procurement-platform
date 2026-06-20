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
    if (!name) return "bg-[#0F1E3C] text-white border-[#0F1E3C]/10";
    const colors = [
      "bg-emerald-50 text-emerald-800 border-emerald-200/50",
      "bg-amber-50 text-amber-800 border-amber-200/50",
      "bg-blue-50 text-blue-800 border-blue-200/50",
      "bg-purple-50 text-purple-800 border-purple-200/50",
      "bg-indigo-50 text-indigo-800 border-indigo-200/50",
      "bg-rose-50 text-rose-800 border-rose-200/50",
    ];
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code += name.charCodeAt(i);
    }
    return colors[code % colors.length];
  };

  // Generate a nice category tag style
  const getCategoryTagClass = (category?: string) => {
    if (!category) return "bg-neutral-100 text-neutral-600 border-neutral-200/30";
    const c = category.toLowerCase();
    if (c.includes("fastener") || c.includes("industrial")) {
      return "bg-indigo-50/70 text-indigo-700 border-indigo-100/50";
    }
    if (c.includes("office") || c.includes("supply")) {
      return "bg-sky-50/70 text-sky-700 border-sky-100/50";
    }
    if (c.includes("electronic") || c.includes("appliances")) {
      return "bg-amber-50/70 text-amber-700 border-amber-100/50";
    }
    return "bg-neutral-50/80 text-neutral-600 border-neutral-200/40";
  };

  return (
    <div className="group bg-white border border-neutral-200/60 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-[0_12px_36px_rgba(15,30,60,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative text-left">
      
      <div className="space-y-4">
        {/* Header: Avatar, Name & Category */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div 
            onClick={onViewProfile}
            className={`h-12 w-12 shrink-0 rounded-full border shadow-sm flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all ${getAvatarColor(vendor.company_name)}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 
              onClick={onViewProfile}
              className="font-bold text-[16px] text-gray-900 leading-tight truncate hover:text-[#0F1E3C] hover:underline cursor-pointer transition-colors" 
              title={vendor.company_name}
            >
              {vendor.company_name || "Unknown Vendor"}
            </h4>
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getCategoryTagClass(vendor.category)}`}>
                {vendor.category}
              </span>
            </div>
          </div>
        </div>

        {/* Spec details: Product item, price, distance inside a structured box */}
        <div className="bg-neutral-50/40 border border-neutral-150/60 rounded-xl p-4 space-y-3">
          <div>
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[8.5px] block mb-1">Item Offered</span>
            <span className="font-semibold text-gray-800 text-sm block truncate" title={vendor.product_name}>
              {vendor.product_name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200/50">
            <div>
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[8.5px] block mb-1">Unit Price</span>
              <span className="font-extrabold text-[#0F1E3C] text-base">₹{vendor.price.toLocaleString()}</span>
            </div>

            <div>
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[8.5px] block mb-1">Distance</span>
              <div className="flex items-center gap-1 font-semibold text-gray-700 text-xs">
                <svg className="w-3.5 h-3.5 text-gray-400 stroke-current fill-none shrink-0" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>
                  {vendor.distanceKm != null ? `${Math.round(vendor.distanceKm)} km` : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Keyword chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((c) => {
            // Pick chip styles based on content
            let bgClass = "bg-neutral-50 text-neutral-600 border-neutral-200/50 hover:bg-neutral-100";
            if (c.includes("pricing") || c.includes("certified")) bgClass = "bg-indigo-50/70 text-indigo-700 border-indigo-200/30 hover:bg-indigo-100/60";
            if (c.includes("delivery") || c.includes("local")) bgClass = "bg-emerald-50/70 text-emerald-700 border-emerald-200/30 hover:bg-emerald-100/60";
            if (c.includes("rating")) bgClass = "bg-amber-50/70 text-amber-700 border-amber-200/30 hover:bg-amber-100/60";

            return (
              <span 
                key={c} 
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider transition-all duration-250 cursor-default ${bgClass}`}
              >
                {c}
              </span>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 mt-5">
        <button
          type="button"
          onClick={onViewProfile}
          className="flex-1 h-10 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.97]"
        >
          View details
        </button>
        <button
          type="button"
          onClick={onNegotiate}
          className="flex-1 h-10 bg-[#0F1E3C] hover:bg-[#162a54] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm hover:shadow-md active:scale-[0.97]"
        >
          Negotiate
        </button>
      </div>

    </div>
  );
}
