import { createClient } from"@/lib/supabase/server";
import { redirect } from"next/navigation";
import Link from"next/link";

export const dynamic ='force-dynamic';

export default async function DealsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Fetch current user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/select-role");

  const isBuyer = profile.role ==="buyer";

  // Fetch RFQ history for the deals
  const query = supabase
    .from("rfq_history")
    .select("id, buyer_id, vendor_id, product_name, quantity, price_per_unit, saved_amount, created_at, priority");

  if (isBuyer) {
    query.eq("buyer_id", user.id);
  } else {
    query.eq("vendor_id", user.id);
  }

  const { data: dealsRows } = await query.order("created_at", { ascending: false });
  const deals = dealsRows || [];

  // Fetch company names of the opposing parties
  const oppositeIds = [...new Set(deals.map(d => isBuyer ? d.vendor_id : d.buyer_id))];
  let companyMap: Record<string, string> = {};

  if (oppositeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, company_name")
      .in("id", oppositeIds);

    if (profiles) {
      companyMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p.company_name ||"Unknown Company" }), {});
    }
  }

  // Enhance deals list
  const enhancedDeals = deals.map(d => {
    const oppositeId = isBuyer ? d.vendor_id : d.buyer_id;
    return {
      ...d,
      partyName: companyMap[oppositeId] || (isBuyer ?"Vendor Partner" :"Buyer Partner"),
      status:"Negotiation" // Awarded RFQs default to active negotiation stage
    };
  });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl text-[#0F1E3C] tracking-tight">Active Deal Rooms</h1>
        <p className="text-sm text-[#6B7280] mt-2">
          Manage contract proposals, communicate with counterparties, and review AI bidding suggestions.
        </p>
      </div>

      {/* Main List */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)]">
        <div className="p-5 border-b border-neutral-200 bg-[#faf8f5]/60">
          <h2 className="text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">Proposal Pipelines</h2>
        </div>

        {enhancedDeals.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="text-3xl">🤝</div>
            <h3 className="text-sm font-bold text-[#0F1E3C]">No negotiations active</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              {isBuyer 
                ?"Award an RFQ from the Compare Vendors tab to open a direct negotiation room with a supplier." 
                :"Awaiting incoming bids. Keep your service areas and catalogues up to date to matching request parameters."}
            </p>
            {isBuyer && (
              <Link
                href="/dashboard"
                className="inline-block mt-2 px-4 py-2 bg-[#0F1E3C] hover:bg-[#1A315C] text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
              >
                Find Vendors &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#faf8f5]/30 text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Initiated Date</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Procured Item</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">{isBuyer ?"Supplier Partner" :"Client"}</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Quantity</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Total Bid</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Stage</th>
                  <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right text-[#0F1E3C]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {enhancedDeals.map((deal) => {
                  const dateFormatted = new Date(deal.created_at).toLocaleDateString("en-IN", {
                    month:"short",
                    day:"numeric",
                    year:"numeric"
                  });
                  const totalVal = deal.price_per_unit * deal.quantity;

                  return (
                    <tr key={deal.id} className="transition-colors hover:bg-neutral-50/50">
                      <td className="px-6 py-5 text-neutral-500 font-medium text-xs">
                        {dateFormatted}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0F1E3C] text-sm">{deal.product_name}</span>
                          {deal.priority && (
                            <span className="text-[10px] text-[#6B7280] mt-0.5 font-medium uppercase tracking-wider">
                              Priority: {deal.priority.replace("_","")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-[#0F1E3C]">
                        {deal.partyName}
                      </td>
                      <td className="px-6 py-5 text-neutral-600  text-xs">
                        {deal.quantity.toLocaleString()} units
                      </td>
                      <td className="px-6 py-5 font-bold text-[#0F1E3C]  text-xs">
                        ₹{totalVal.toLocaleString()}
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E8A838]/10 text-[#E8A838] border border-[#E8A838]/20">
                          {deal.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/dashboard/deals/${deal.id}`}
                          className="inline-block px-3 py-1.5 bg-[#0F1E3C] hover:bg-[#1A315C] text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Enter Room
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
