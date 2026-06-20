"use client";

import { useState } from"react";

type VendorSearchFormProps = {
  searchMode:"catalog" |"semantic";
  setSearchMode: (mode:"catalog" |"semantic") => void;
  category: string | null;
  setCategory: (cat: string | null) => void;
  categories: string[];
  item: string;
  setItem: (item: string) => void;
  items: string[];
  quantity: number |"";
  setQuantity: (qty: number |"") => void;
  deadline: number |"";
  setDeadline: (days: number |"") => void;
  semanticQuery: string;
  setSemanticQuery: (query: string) => void;
  onSearch: () => void;
  loading: boolean;
};

export default function VendorSearchForm({
  searchMode,
  setSearchMode,
  category,
  setCategory,
  categories,
  item,
  setItem,
  items,
  quantity,
  setQuantity,
  deadline,
  setDeadline,
  semanticQuery,
  setSemanticQuery,
  onSearch,
  loading,
}: VendorSearchFormProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [expandSemantic, setExpandSemantic] = useState(searchMode ==="semantic");

  const handleModeChange = (mode:"catalog" |"semantic") => {
    setSearchMode(mode);
    if (mode ==="semantic") {
      setExpandSemantic(true);
    }
  };

  const isFormInvalid = searchMode ==="catalog" && !category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid) return;
    onSearch();
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-[0_2px_8px_rgba(15,30,60,0.02)]">
      <div className="text-left space-y-1 mb-5">
        <h2 className="text-[20px] font-medium text-[#111827] tracking-tight">
          Find vendors
        </h2>
        <p className="text-xs text-[#6B7280]">
          Search by catalog item or describe your need
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Search Mode Toggle Pill */}
        <div className="flex bg-neutral-100 p-0.5 rounded-full border border-[#E5E7EB] w-full">
          <button
            type="button"
            onClick={() => handleModeChange("catalog")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              searchMode ==="catalog" 
                ?"bg-[#0F1E3C] text-white shadow-sm" 
                :"text-[#6B7280] hover:text-[#0f1e3c]"
            }`}
          >
            Catalog item
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("semantic")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              searchMode ==="semantic" 
                ?"bg-[#0F1E3C] text-white shadow-sm" 
                :"text-[#6B7280] hover:text-[#0f1e3c]"
            }`}
          >
            Smart search ✦
          </button>
        </div>

        {/* Dynamic Input Rendering */}
        {searchMode ==="catalog" ? (
          <div className="space-y-4">
            {/* Category Select */}
            <div className="flex flex-col">
              <label className="text-[14px] text-[#6B7280] font-medium mb-1.5">
                Category
              </label>
              <select
                value={category ||""}
                onChange={(e) => {
                  setCategory(e.target.value || null);
                  setItem("");
                }}
                className="w-full h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
              >
                <option value="" disabled>Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Dependent Item Select */}
            <div className="flex flex-col">
              <label className="text-[14px] text-[#6B7280] font-medium mb-1.5">
                Item
              </label>
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                disabled={!category}
                className="w-full h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {category ?"Select item..." :"Choose category first"}
                </option>
                {items.map((it) => (
                  <option key={it} value={it}>{it}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* Semantic Query Box */
          <div className="flex flex-col animate-fade-in">
            <label className="text-[14px] text-[#6B7280] font-medium mb-1.5">
              Sourcing requirements
            </label>
            <textarea
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              placeholder="e.g. Find manufacturers of ergonomic keyboards with volume stock in Greater Noida"
              className="w-full min-h-[96px] p-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] resize-y placeholder:text-neutral-400"
            />
          </div>
        )}

        {/* Volume / Quantity input */}
        <div className="flex flex-col">
          <label className="text-[14px] text-[#6B7280] font-medium mb-1.5">
            Volume / quantity
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) :"")}
              placeholder="e.g. 100"
              className="w-full h-10 pl-3 pr-16 border border-[#E5E7EB] rounded-[8px] text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
            />
            <span className="absolute right-3 text-xs text-[#6B7280] font-medium pointer-events-none">
              units
            </span>
          </div>
        </div>

        {/* Delivery SLA input */}
        <div className="flex flex-col">
          <label className="text-[14px] text-[#6B7280] font-medium mb-1.5">
            Delivery SLA
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value ? Number(e.target.value) :"")}
              placeholder="e.g. 7"
              className="w-full h-10 pl-3 pr-24 border border-[#E5E7EB] rounded-[8px] text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
            />
            <span className="absolute right-3 text-xs text-[#6B7280] font-medium pointer-events-none">
              days max
            </span>
          </div>
        </div>

        {/* CTA Button Wrapper with tooltip */}
        <div 
          className="relative pt-2"
          onMouseEnter={() => isFormInvalid && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {showTooltip && isFormInvalid && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-[#0F1E3C] text-white text-[11px] font-bold py-1.5 px-3 rounded-lg shadow-md z-30 animate-fade-in">
              Select a category first
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0F1E3C]" />
            </div>
          )}

          <button
            type="submit"
            className="w-full h-11 bg-[#0F1E3C] hover:bg-[#1A315C] text-sm font-semibold text-white rounded-[8px] transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </span>
            ) : (
              "Search vendors"
            )}
          </button>
        </div>


      </form>
    </div>
  );
}
