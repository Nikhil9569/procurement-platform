import { createClient } from "@/lib/supabase/server";
import { Fraunces } from "next/font/google";
import LeaderboardView from "./LeaderboardView";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // 1. Fetch Vendors (Profiles)
  const { data: vendors } = await supabase
    .from("profiles")
    .select("id, company_name, contact_email")
    .eq("role", "vendor");

  // 2. Fetch Catalog Ratings (Static brochure quality)
  const { data: catalog } = await supabase
    .from("vendor_catalog")
    .select("vendor_id, category, rating");

  // 3. Fetch Buyer Experience Ratings (Dynamic feedback)
  const { data: history } = await supabase
    .from("rfq_history")
    .select("vendor_id, experience_rating")
    .not("experience_rating", "is", null);

  if (!vendors || !catalog) {
    return <div className="p-8">Error loading leaderboard data.</div>;
  }

  // Group and calculate scores
  // Score formula: 60% Buyer Experience + 40% Catalog Rating
  // If no buyer experience, 100% Catalog Rating.

  const vendorScores = vendors.map(v => {
    const vCatalog = catalog.filter(c => c.vendor_id === v.id);
    const vHistory = (history || []).filter(h => h.vendor_id === v.id);

    // Calculate Average Catalog Rating (0-5)
    const validCatalogRatings = vCatalog.filter(c => typeof c.rating === 'number');
    const avgCatalogRating = validCatalogRatings.length > 0
      ? validCatalogRatings.reduce((sum, c) => sum + (c.rating || 0), 0) / validCatalogRatings.length
      : 0;

    // Calculate Average Experience Rating (0-5)
    const avgExpRating = vHistory.length > 0
      ? vHistory.reduce((sum, h) => sum + (h.experience_rating || 0), 0) / vHistory.length
      : 0;

    // Final Score out of 100
    let finalScore = 0;
    if (avgExpRating > 0 && avgCatalogRating > 0) {
      finalScore = ((avgExpRating / 5) * 60) + ((avgCatalogRating / 5) * 40);
    } else if (avgExpRating > 0) {
      finalScore = (avgExpRating / 5) * 100;
    } else if (avgCatalogRating > 0) {
      finalScore = (avgCatalogRating / 5) * 100;
    }

    // Determine categories this vendor operates in
    const categories = [...new Set(vCatalog.map(c => c.category).filter(Boolean))];

    return {
      id: v.id,
      company_name: v.company_name || "Unknown Vendor",
      contact_email: v.contact_email || "No email",
      categories,
      avgCatalogRating,
      avgExpRating,
      totalOrders: vHistory.length,
      finalScore: Math.round(finalScore)
    };
  }).filter(v => v.finalScore > 0); // Only show vendors with at least some rating

  // Sort global top
  const globalRanking = [...vendorScores].sort((a, b) => b.finalScore - a.finalScore);

  return (
    <div className="p-8 max-w-6xl mx-auto animate-[fadeUp_0.4s_ease-out_both]">
      <div className="mb-8">
        <h1 className={`${fraunces.className} text-3xl text-stone-900`}>Vendor Leaderboard</h1>
        <p className="mt-2 text-stone-500">Discover the top-rated suppliers based on AI analysis and verified buyer feedback.</p>
      </div>

      <LeaderboardView vendors={globalRanking} />
    </div>
  );
}
