"use client";

import VendorCard from"./VendorCard";
import { CatalogItem, ScoreBreakdown } from"@/lib/scoring";

type Pos = { lat: number; lng: number };

type EnhancedVendor = CatalogItem & {
  score: number;
  company_name?: string;
  contact_email?: string;
  breakdown?: ScoreBreakdown[];
  distanceKm?: number | null;
  vendorPos?: Pos | null;
};

type VendorResultsGridProps = {
  vendors: EnhancedVendor[];
  loading: boolean;
  hasSearched: boolean;
  onNegotiate: (vendorId: string, companyName: string, product: string, price: number) => void;
  onAward: (vendorId: string, companyName: string, product: string, price: number) => void;
  onTryPreset: (category: string, volume: string, destination?: string) => void;
};

export default function VendorResultsGrid({
  vendors,
  loading,
  hasSearched,
  onNegotiate,
  onAward,
  onTryPreset,
}: VendorResultsGridProps) {

  // Loading Skeletons mirroring the redesigned VendorCard structure
  const renderSkeletons = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 shadow-sm animate-pulse text-left"
          >
            {/* Header: Avatar, Name & Category, Score */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-100 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-24" />
                  <div className="h-2.5 bg-neutral-100 rounded w-16" />
                </div>
              </div>
              <div className="h-6 bg-neutral-100 rounded-full w-16" />
            </div>
            
            {/* Spec Info Box details */}
            <div className="h-20 bg-neutral-50 rounded-lg space-y-2 p-3 flex flex-col justify-center">
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
              <div className="h-3 bg-neutral-100 rounded w-2/3" />
            </div>

            {/* Tags Chips */}
            <div className="flex gap-2">
              <div className="h-5 bg-neutral-100 rounded-full w-12" />
              <div className="h-5 bg-neutral-100 rounded-full w-16" />
              <div className="h-5 bg-neutral-100 rounded-full w-14" />
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-2 border-t border-neutral-100">
              <div className="h-9 bg-neutral-100 rounded-lg flex-1" />
              <div className="h-9 bg-neutral-200 rounded-lg flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Empty State (Before search)
  if (!hasSearched && !loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] py-12 px-6 bg-white border border-gray-100 rounded-xl animate-fade-in">
        {/* Large SVG search icon */}
        <div className="h-14 w-14 rounded-full bg-[#0F1E3C]/5 text-[#0F1E3C] flex items-center justify-center mb-4">
          <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h3 className="text-[18px] font-medium text-[#111827]">
          No results yet
        </h3>
        <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">
          Select a category, set your volume and delivery requirements, then run AI matching to see ranked vendors.
        </p>

        {/* Suggestion preset query chips */}
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <button
            type="button"
            onClick={() => onTryPreset("Office supplies","500")}
            className="px-3 py-1.5 bg-[#0F1E3C]/5 hover:bg-[#0F1E3C]/10 border border-[#0F1E3C]/10 text-xs font-semibold text-[#0F1E3C] rounded-full transition-colors cursor-pointer"
          >
            Try: Office supplies, 500 units
          </button>
          <button
            type="button"
            onClick={() => onTryPreset("Industrial fasteners","100","Mumbai")}
            className="px-3 py-1.5 bg-[#0F1E3C]/5 hover:bg-[#0F1E3C]/10 border border-[#0F1E3C]/10 text-xs font-semibold text-[#0F1E3C] rounded-full transition-colors cursor-pointer"
          >
            Try: Industrial fasteners, Mumbai
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return renderSkeletons();
  }

  if (vendors.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[360px] animate-fade-in w-full text-gray-500">
        <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h4 className="text-[16px] font-medium text-[#111827]">No matching suppliers found</h4>
        <p className="text-xs mt-1.5 max-w-xs leading-relaxed">
          Adjust your active SLA slider bounds or distance parameters to broaden recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendors.map((v) => (
          <VendorCard
            key={v.id}
            vendor={v}
            onNegotiate={() => onNegotiate(v.vendor_id, v.company_name ||"Supplier", v.product_name, v.price)}
            onAward={() => onAward(v.vendor_id, v.company_name ||"Supplier", v.product_name, v.price)}
          />
        ))}
      </div>
    </div>
  );
}
