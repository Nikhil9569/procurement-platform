"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VendorRatingProps {
  dealId: string;
}

export default function VendorRating({ dealId }: VendorRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("rfq_history")
        .update({ experience_rating: rating, feedback_notes: feedback })
        .eq("id", dealId);

      if (updateError) throw updateError;

      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Error submitting rating:", err);
      setError(err.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            ✓
          </div>
        </div>
        <h4 className="text-emerald-900 font-bold">Thank you for rating!</h4>
        <p className="text-xs text-emerald-700 mt-1">Your feedback helps improve the procurement ecosystem.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_4px_25px_rgb(15,30,60,0.01)] animate-in fade-in duration-300">
      <h3 className="text-sm font-bold text-[#0F1E3C] text-center mb-1">Rate the Vendor</h3>
      <p className="text-xs text-[#6B7280] text-center mb-4">How was your experience working with this vendor?</p>
      
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
          >
            <Star 
              className={`w-8 h-8 transition-colors ${
                (hoverRating || rating) >= star 
                  ? "fill-[#E8A838] text-[#E8A838]" 
                  : "fill-neutral-100 text-neutral-300 hover:text-[#E8A838]/50"
              }`} 
            />
          </button>
        ))}
      </div>

      <div className="mb-4">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Leave a comment (optional)..."
          className="w-full text-xs p-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[#0F1E3C]/20 transition-all resize-none h-20 text-[#111827]"
        />
      </div>

      {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            rating === 0 || isSubmitting
              ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              : "bg-[#0F1E3C] text-white hover:bg-[#0F1E3C]/90 hover:shadow-md cursor-pointer"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit Rating"}
        </button>
      </div>
    </div>
  );
}
