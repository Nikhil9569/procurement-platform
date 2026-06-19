"use client";

import { useState, useEffect } from"react";

type ActiveConstraintsProps = {
  priority: string;
  setPriority: (p: string) => void;
  priceWeight: number;
  setPriceWeight: (w: number) => void;
  proximityWeight: number;
  setProximityWeight: (w: number) => void;
  deliveryWeight: number;
  setDeliveryWeight: (w: number) => void;
};

export default function ActiveConstraints({
  priority,
  setPriority,
  priceWeight,
  setPriceWeight,
  proximityWeight,
  setProximityWeight,
  deliveryWeight,
  setDeliveryWeight,
}: ActiveConstraintsProps) {
  const [expandInfo, setExpandInfo] = useState(false);

  // Sync sliders when priority preset changes
  useEffect(() => {
    if (priority ==="balanced") {
      setPriceWeight(33);
      setProximityWeight(33);
      setDeliveryWeight(34);
    } else if (priority ==="price_critical") {
      setPriceWeight(70);
      setProximityWeight(15);
      setDeliveryWeight(15);
    } else if (priority ==="fast_delivery") {
      setPriceWeight(20);
      setProximityWeight(20);
      setDeliveryWeight(60);
    }
  }, [priority, setPriceWeight, setProximityWeight, setDeliveryWeight]);

  const handleManualOverride = (factor:"price" |"proximity" |"delivery", val: number) => {
    setPriority("custom"); // Clear active preset since manual adjustment is happening
    if (factor ==="price") setPriceWeight(val);
    if (factor ==="proximity") setProximityWeight(val);
    if (factor ==="delivery") setDeliveryWeight(val);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 shadow-[0_2px_8px_rgba(15,30,60,0.02)] space-y-5 text-left">
      <div className="space-y-1">
        <h3 className="text-[14px] font-medium text-[#111827]">
          Scoring weights
        </h3>
        <p className="text-[11px] text-[#6B7280]">
          Adjust matching weights to guide vendor ranking algorithms.
        </p>
      </div>

      {/* Preset pills horizontally */}
      <div className="flex flex-wrap gap-2 w-full">
        <button
          type="button"
          onClick={() => setPriority("balanced")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            priority ==="balanced"
              ?"bg-[#E8A838] border-[#E8A838] text-[#0f1e3c]"
              :"bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#0F1E3C] hover:border-neutral-300"
          }`}
        >
          Balanced
        </button>
        <button
          type="button"
          onClick={() => setPriority("price_critical")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            priority ==="price_critical"
              ?"bg-[#E8A838] border-[#E8A838] text-[#0f1e3c]"
              :"bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#0F1E3C] hover:border-neutral-300"
          }`}
        >
          Lowest price
        </button>
        <button
          type="button"
          onClick={() => setPriority("fast_delivery")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            priority ==="fast_delivery"
              ?"bg-[#E8A838] border-[#E8A838] text-[#0f1e3c]"
              :"bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#0F1E3C] hover:border-neutral-300"
          }`}
        >
          Fastest delivery
        </button>
      </div>

      {/* Weight Sliders */}
      <div className="space-y-3 pt-2">
        {/* Price Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
            <span>Price Match</span>
            <span className="text-[#0F1E3C] font-semibold">{priceWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={priceWeight}
            onChange={(e) => handleManualOverride("price", Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* Proximity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
            <span>Proximity Match</span>
            <span className="text-[#0F1E3C] font-semibold">{proximityWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={proximityWeight}
            onChange={(e) => handleManualOverride("proximity", Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* Delivery speed slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
            <span>Delivery Speed</span>
            <span className="text-[#0F1E3C] font-semibold">{deliveryWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={deliveryWeight}
            onChange={(e) => handleManualOverride("delivery", Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Expandable Explanation section */}
      <div className="pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => setExpandInfo(!expandInfo)}
          className="flex items-center justify-between w-full text-xs font-semibold text-[#0F1E3C] hover:underline cursor-pointer"
        >
          <span>Why does this matter?</span>
          <span>{expandInfo ?"↑" :"↓"}</span>
        </button>
        {expandInfo && (
          <p className="text-[11px] text-[#6B7280] leading-relaxed mt-2 animate-fade-in">
            These weights modify the vector search optimization function. If Price Match is set to 70%, the AI ranking engine will aggressively prioritize vendors offering lower unit cost proposals, even if it introduces logistics delays.
          </p>
        )}
      </div>

    </div>
  );
}
