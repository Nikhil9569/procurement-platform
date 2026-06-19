"use client";

import { useEffect, useState } from"react";

type ScoringWeightsProps = {
  weightPreset:'balanced' |'price' |'speed' |'custom';
  setWeightPreset: (preset:'balanced' |'price' |'speed' |'custom') => void;
  weights: { price: number; proximity: number; speed: number };
  setWeights: (w: { price: number; proximity: number; speed: number }) => void;
};

export default function ScoringWeights({
  weightPreset,
  setWeightPreset,
  weights,
  setWeights,
}: ScoringWeightsProps) {
  const [expandInfo, setExpandInfo] = useState(false);

  // Sync sliders when priority preset changes
  useEffect(() => {
    if (weightPreset ==="balanced") {
      setWeights({ price: 33, proximity: 33, speed: 34 });
    } else if (weightPreset ==="price") {
      setWeights({ price: 70, proximity: 15, speed: 15 });
    } else if (weightPreset ==="speed") {
      setWeights({ price: 20, proximity: 20, speed: 60 });
    }
  }, [weightPreset, setWeights]);

  const handleManualOverride = (factor:"price" |"proximity" |"speed", val: number) => {
    setWeightPreset("custom"); // Clear active preset since manual adjustment is happening
    setWeights({
      ...weights,
      [factor]: val,
    });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 text-left space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-700">
          Scoring weights
        </h3>
        <p className="text-xs text-gray-500">
          Adjust matching weights to guide vendor ranking algorithms
        </p>
      </div>

      {/* Preset Pills */}
      <div className="flex flex-wrap gap-2 w-full">
        <button
          type="button"
          onClick={() => setWeightPreset("balanced")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            weightPreset ==="balanced"
              ?"bg-[#E8A838] border-[#E8A838] text-[#412402]"
              :"bg-white border-gray-200 text-gray-500 hover:text-[#0F1E3C] hover:border-gray-300"
          }`}
        >
          Balanced
        </button>
        <button
          type="button"
          onClick={() => setWeightPreset("price")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            weightPreset ==="price"
              ?"bg-[#E8A838] border-[#E8A838] text-[#412402]"
              :"bg-white border-gray-200 text-gray-500 hover:text-[#0F1E3C] hover:border-gray-300"
          }`}
        >
          Lowest price
        </button>
        <button
          type="button"
          onClick={() => setWeightPreset("speed")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            weightPreset ==="speed"
              ?"bg-[#E8A838] border-[#E8A838] text-[#412402]"
              :"bg-white border-gray-200 text-gray-500 hover:text-[#0F1E3C] hover:border-gray-300"
          }`}
        >
          Fastest delivery
        </button>
      </div>

      {/* Weight Sliders */}
      <div className="space-y-4 pt-2">
        {/* Price Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-medium text-gray-700">
            <span>Price weight</span>
            <span className="text-[#0F1E3C] font-semibold">{weights.price}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={weights.price}
            onChange={(e) => handleManualOverride("price", Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* Proximity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-medium text-gray-700">
            <span>Proximity</span>
            <span className="text-[#0F1E3C] font-semibold">{weights.proximity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={weights.proximity}
            onChange={(e) => handleManualOverride("proximity", Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* Delivery speed slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-medium text-gray-700">
            <span>Delivery speed</span>
            <span className="text-[#0F1E3C] font-semibold">{weights.speed}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={weights.speed}
            onChange={(e) => handleManualOverride("speed", Number(e.target.value))}
            className="w-full accent-[#0F1E3C] h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Expandable Explanation section */}
      <div className="pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => setExpandInfo(!expandInfo)}
          className="flex items-center justify-between w-full text-xs font-semibold text-[#0F1E3C] hover:underline cursor-pointer"
        >
          <span>Why does this matter?</span>
          <span>{expandInfo ?"↑" :"↓"}</span>
        </button>
        {expandInfo && (
          <p className="text-xs text-gray-500 leading-relaxed mt-2 animate-fade-in">
            These weights modify the vector search optimization function. If Price Match is prioritized, the AI ranking engine will select vendors offering lower unit cost proposals, even if they have longer delivery times or are further away.
          </p>
        )}
      </div>

    </div>
  );
}
