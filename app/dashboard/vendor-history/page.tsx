import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BrochureHistoryList from "@/components/BrochureHistoryList";
import VendorAwardList from "@/components/VendorAwardList";
import { Trophy, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendorHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch RFQ history awarded to this vendor
  const { data: awards, error: awardsErr } = await supabase
    .from("rfq_history")
    .select(`
      id,
      product_name,
      quantity,
      price_per_unit,
      created_at,
      buyer_id
    `)
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  // Get buyer profiles
  const buyerIds = [...new Set((awards || []).map(a => a.buyer_id))];
  let buyerProfiles: Record<string, any> = {};
  if (buyerIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, company_name, full_name, contact_email, phone_number, address").in("id", buyerIds);
    if (profiles) {
      profiles.forEach(p => {
        buyerProfiles[p.id] = p;
      });
    }
  }

  // Fetch Brochure Upload History from DB brochure_uploads table
  const { data: uploads, error: uploadsErr } = await supabase
    .from("brochure_uploads")
    .select("*")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#faf8f5] p-8">
      <div className="max-w-6xl mx-auto animate-[fadeUp_0.4s_ease-out_both]">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Vendor History</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Awards Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#E8A838]" /> Won RFQs
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              {awardsErr ? (
                <div className="p-8 text-center text-red-500 text-sm">{awardsErr.message}</div>
              ) : (
                <VendorAwardList awards={awards || []} buyerProfiles={buyerProfiles} />
              )}
            </div>
          </div>

          {/* Upload History Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E8A838]" /> Brochure Uploads
            </h2>
            <BrochureHistoryList initialUploads={uploads || []} error={uploadsErr?.message} />
          </div>

        </div>
      </div>
    </main>
  );
}
