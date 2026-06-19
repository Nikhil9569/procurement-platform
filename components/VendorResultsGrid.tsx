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
  onTryQuery: () => void;
};

export default function VendorResultsGrid({
  vendors,
  loading,
  hasSearched,
  onNegotiate,
  onAward,
  onTryQuery,
}: VendorResultsGridProps) {
  
  // Renders skeleton loaders for grid layout
  const renderSkeletons = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 space-y-4 shadow-sm animate-pulse text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-neutral-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-neutral-200 rounded w-2/3" />
                <div className="h-2.5 bg-neutral-100 rounded w-1/3" />
              </div>
            </div>
            <div className="h-20 bg-neutral-50 rounded-[8px]" />
            <div className="flex gap-2">
              <div className="h-8 bg-neutral-100 rounded-[8px] flex-1" />
              <div className="h-8 bg-neutral-200 rounded-[8px] flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Empty State Skeletons
  if (!hasSearched && !loading) {
    return (
      <div className="w-full space-y-8 animate-fade-in">
        {/* Ghost Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-30 pointer-events-none select-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 space-y-4 shadow-sm text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-neutral-200 rounded w-2/3" />
                  <div className="h-2.5 bg-neutral-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-20 bg-neutral-50 rounded-[8px]" />
              <div className="flex gap-2">
                <div className="h-8 bg-neutral-100 rounded-[8px] flex-1" />
                <div className="h-8 bg-neutral-200 rounded-[8px] flex-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Centered instruction text */}
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="h-12 w-12 rounded-full bg-[#0F1E3C]/5 text-[#0F1E3C] flex items-center justify-center text-xl mb-3">
            🎯
          </div>
          <h3 className="text-sm font-bold text-[#0F1E3C] tracking-tight">
            Run a search to see ranked vendor matches
          </h3>
          <p className="text-xs text-[#6B7280] mt-1.5 max-w-sm leading-relaxed">
            Fill in the Sourcing Form and geolocalize delivery coordinates to generate match bids.
          </p>
          <button
            type="button"
            onClick={onTryQuery}
            className="text-xs font-semibold text-[#E8A838] hover:text-[#0f1e3c] hover:underline mt-4 cursor-pointer"
          >
            Try: Office supplies, 500 units, Mumbai
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
      <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-12 text-center flex flex-col items-center justify-center min-h-[300px] animate-fade-in w-full text-[#6B7280]">
        <span className="text-3xl mb-3">🔍</span>
        <h4 className="text-sm font-bold text-[#0F1E3C]">No supplier fits found</h4>
        <p className="text-xs mt-1.5 max-w-xs leading-relaxed">
          Try expanding your maximum delivery radius or reducing SLA constraints.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
