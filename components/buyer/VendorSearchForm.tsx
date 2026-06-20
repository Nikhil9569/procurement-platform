"use client";

import { useState } from "react";
import { Package, Clock } from "lucide-react";

type VendorSearchFormProps = {
  mode:"catalog" |"semantic";
  setMode: (m:"catalog" |"semantic") => void;
  category: string;
  setCategory: (c: string) => void;
  categories: string[];
  item: string;
  setItem: (i: string) => void;
  items: string[];
  volume: string;
  setVolume: (v: string) => void;
  sla: string;
  setSla: (s: string) => void;
  onSearch: () => void;
  loading: boolean;
  semanticQuery: string;
  setSemanticQuery: (q: string) => void;
};

export default function VendorSearchForm({
  mode,
  setMode,
  category,
  setCategory,
  categories,
  item,
  setItem,
  items,
  volume,
  setVolume,
  sla,
  setSla,
  onSearch,
  loading,
  semanticQuery,
  setSemanticQuery,
}: VendorSearchFormProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isFormInvalid = mode ==="catalog" && !category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid) return;
    onSearch();
  };

  return (
    <div className="space-y-5 text-left">
      
      {/* Header Info */}
      <div className="space-y-1">
        <h2 className="text-[20px] font-medium text-[#111827] leading-none">
          Find vendors
        </h2>
        <p className="text-gray-500 text-xs">
          Search by catalog item or describe your need
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Pills - 50% width each */}
        <div className="flex bg-neutral-100 p-0.5 rounded-full border border-neutral-200 w-full shrink-0">
          <button
            type="button"
            onClick={() => setMode("catalog")}
            className={`w-1/2 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mode ==="catalog" 
                ?"bg-[#0F1E3C] text-white shadow-sm" 
                :"text-gray-500 hover:text-[#0f1e3c]"
            }`}
          >
            Catalog item
          </button>
          <button
            type="button"
            onClick={() => setMode("semantic")}
            className={`w-1/2 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              mode ==="semantic" 
                ?"bg-[#0F1E3C] text-white shadow-sm" 
                :"text-gray-500 hover:text-[#0f1e3c]"
            }`}
          >
            Smart search ✦
          </button>
        </div>

        {/* Dynamic Mode inputs */}
        {mode ==="catalog" ? (
          <div className="space-y-4">
            {/* Category selection */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setItem("");
                }}
                className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
              >
                <option value="" disabled>Select category...</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Dependent Item selection */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1.5">
                Item
              </label>
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                disabled={!category}
                className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] disabled:opacity-50 disabled:bg-neutral-50 disabled:cursor-not-allowed"
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
          <div className="space-y-4 animate-fade-in">
            {/* Category selection for semantic mode */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Semantic query description */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1.5">
                Describe requirement
              </label>
              <textarea
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                placeholder="e.g. mouse that won't hurt my wrist..."
                className="w-full min-h-[96px] p-3 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C] resize-y placeholder:text-neutral-400 font-medium"
              />
            </div>
          </div>
        )}

        {/* Volume / Quantity input */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1.5">
            Volume / quantity
          </label>
          <div className="relative flex items-center">
            <Package className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="e.g. 500"
              className="w-full h-10 pl-9 pr-16 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
            />
            <span className="absolute right-3 text-xs text-gray-500 font-medium pointer-events-none">
              units
            </span>
          </div>
        </div>

        {/* Delivery SLA input */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1.5">
            Delivery SLA
          </label>
          <div className="relative flex items-center">
            <Clock className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="number"
              value={sla}
              onChange={(e) => setSla(e.target.value)}
              placeholder="e.g. 10"
              className="w-full h-10 pl-9 pr-24 border border-neutral-200 rounded-lg text-sm text-[#111827] bg-white outline-none focus:border-[#0F1E3C] focus:ring-1 focus:ring-[#0F1E3C]"
            />
            <span className="absolute right-3 text-xs text-gray-500 font-medium pointer-events-none">
              days max
            </span>
          </div>
        </div>

        {/* Tooltip trigger wrapper */}
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
            className="w-full h-11 bg-[#0F1E3C] text-white hover:bg-[#1a2f5e] rounded-lg transition-colors font-medium cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
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
