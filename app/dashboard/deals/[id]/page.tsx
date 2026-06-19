import { createClient } from"@/lib/supabase/server";
import { redirect } from"next/navigation";
import Link from"next/link";
import DealRoom from"@/components/DealRoom";

export const dynamic ='force-dynamic';

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function DealRoomPage({ params }: PageProps) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const id = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/select-role");

  // Fetch RFQ record details
  const { data: rfq, error } = await supabase
    .from("rfq_history")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !rfq) {
    return (
      <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl max-w-md mx-auto space-y-4 animate-fade-in">
        <div className="text-3xl">⚠️</div>
        <h3 className="text-sm font-bold text-[#0F1E3C]">Deal Room Not Found</h3>
        <p className="text-xs text-[#6B7280]">We could not locate an active negotiation proposal matching this ID.</p>
        <Link 
          href="/dashboard/deals" 
          className="inline-block px-4 py-2 bg-[#0F1E3C] hover:bg-[#1A315C] text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          Return to Pipeline List
        </Link>
      </div>
    );
  }

  // Determine opposing party name
  const isBuyer = profile.role ==="buyer";
  const targetPartyId = isBuyer ? rfq.vendor_id : rfq.buyer_id;

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", targetPartyId)
    .single();

  const partyName = targetProfile?.company_name || (isBuyer ?"Vendor Partner" :"Buyer Partner");

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <DealRoom
        dealId={rfq.id}
        productName={rfq.product_name}
        quantity={rfq.quantity}
        pricePerUnit={Number(rfq.price_per_unit)}
        createdAt={rfq.created_at}
        priority={rfq.priority ||"balanced"}
        partyName={partyName}
        isBuyer={isBuyer}
        myCompanyName={profile.company_name ||"My Company"}
      />
    </div>
  );
}
