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
  onTryPreset: (category: string, volume: string, destination?: string) => void;
  onViewProfile: (vendorId: string) => void;
  catalogEmpty?: boolean;
  onSeedCatalog?: () => void;
};

export default function VendorResultsGrid({
  vendors,
  loading,
  hasSearched,
  onNegotiate,
  onTryPreset,
  onViewProfile,
  catalogEmpty = false,
  onSeedCatalog,
}: VendorResultsGridProps) {

  // Loading Skeletons mirroring the redesigned VendorCard structure
  const renderSkeletons = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="bg-white border border-neutral-200/60 rounded-2xl p-6 space-y-5 shadow-sm animate-pulse text-left"
          >
            {/* Header: Avatar, Name & Category */}
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-full bg-neutral-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-neutral-200 rounded w-28" />
                <div className="h-2.5 bg-neutral-150 rounded w-20" />
              </div>
            </div>
            
            {/* Spec Info Box details */}
            <div className="bg-neutral-50/50 border border-neutral-100/50 rounded-xl p-4 space-y-3">
              <div className="space-y-1">
                <div className="h-2.5 bg-neutral-200 rounded w-16" />
                <div className="h-3.5 bg-neutral-150 rounded w-32" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200/50">
                <div className="space-y-1">
                  <div className="h-2.5 bg-neutral-200 rounded w-12" />
                  <div className="h-4 bg-neutral-150 rounded w-16" />
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 bg-neutral-200 rounded w-12" />
                  <div className="h-4 bg-neutral-150 rounded w-16" />
                </div>
              </div>
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
      <div className="flex flex-col justify-between h-full bg-white border border-gray-100 rounded-xl p-8 shadow-sm animate-fade-in text-left">
        
        {catalogEmpty && (
          <div className="mb-6 p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div>
              <span className="font-bold text-amber-900 block text-sm mb-0.5">Database catalog is empty!</span>
              In order to test the Category/Item search dropdown filters, you must seed mock catalog items.
            </div>
            <button
              type="button"
              onClick={onSeedCatalog}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Seed Mock Catalog
            </button>
          </div>
        )}

        {/* Top Section: Search Illustration, Heading, and Try Chips */}
        <div className="max-w-xl mx-auto text-center py-6">
          <div className="h-16 w-16 rounded-full bg-[#0F1E3C]/5 text-[#0F1E3C] flex items-center justify-center mb-5 mx-auto">
            <svg className="w-7 h-7 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#0F1E3C] tracking-tight">
            No results yet
          </h3>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed font-semibold">
            Select a category, set your volume and delivery requirements, then run AI matching to see ranked vendors.
          </p>

          {/* Suggestion preset query chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => onTryPreset("Office supplies", "500")}
              className="px-4 py-2 bg-[#0F1E3C]/5 hover:bg-[#0F1E3C]/10 border border-[#0F1E3C]/10 text-xs font-bold text-[#0F1E3C] rounded-full transition-colors cursor-pointer"
            >
              Try: Office supplies, 500 units
            </button>
            <button
              type="button"
              onClick={() => onTryPreset("Industrial fasteners", "100", "Mumbai")}
              className="px-4 py-2 bg-[#0F1E3C]/5 hover:bg-[#0F1E3C]/10 border border-[#0F1E3C]/10 text-xs font-bold text-[#0F1E3C] rounded-full transition-colors cursor-pointer"
            >
              Try: Industrial fasteners, Mumbai
            </button>
          </div>
        </div>

        {/* Middle Section: 3-Step Sourcing Workflow */}
        <div className="border-t border-neutral-100 py-6 my-4">
          <h4 className="text-xs font-bold text-[#0F1E3C]/60 uppercase tracking-widest mb-6 text-center">
            AI Sourcing Workflow Guide
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-[#E8A838]/10 text-[#412402] border border-[#E8A838]/20 flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-gray-900">Define Sourcing Mode</h5>
                <p className="text-[11px] text-gray-500 font-semibold leading-normal">
                  Select a catalog product or describe your procurement need using semantic search.
                </p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-[#E8A838]/10 text-[#412402] border border-[#E8A838]/20 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-gray-900">Balance AI Weights</h5>
                <p className="text-[11px] text-gray-500 font-semibold leading-normal">
                  Tune price, proximity, and delivery speed sliders to match your business priorities.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-[#E8A838]/10 text-[#412402] border border-[#E8A838]/20 flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-gray-900">Match & Select Bids</h5>
                <p className="text-[11px] text-gray-500 font-semibold leading-normal">
                  Run the AI matching engine to rank proposals, view vendor details, or start negotiations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Mock Dimmed Vendor Skeletons Preview */}
        <div className="border-t border-neutral-100 pt-6 opacity-30 select-none pointer-events-none hidden md:block">
          <h4 className="text-xs font-bold text-[#0F1E3C]/60 uppercase tracking-widest mb-4 text-center">
            Preview: AI Ranked Supplier Proposals
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-neutral-200 rounded-lg p-4 space-y-3 bg-neutral-50/50">
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-neutral-300 rounded w-16" />
                  <div className="h-4 bg-neutral-200 rounded-full w-12" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-neutral-200 rounded w-20" />
                  <div className="h-2.5 bg-neutral-300 rounded w-24" />
                </div>
                <div className="h-6 bg-neutral-200 rounded w-full mt-2" />
              </div>
            ))}
          </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {vendors.map((v) => (
          <VendorCard
            key={v.id}
            vendor={v}
            onNegotiate={() => onNegotiate(v.vendor_id, v.company_name || "Supplier", v.product_name, v.price)}
            onViewProfile={() => onViewProfile(v.vendor_id)}
          />
        ))}
      </div>
    </div>
  );
}
