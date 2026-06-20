import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

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

  const isBuyer = profile.role === "buyer";

  // Fetch RFQ history for the deals
  const query = supabase
    .from("rfq_history")
    .select("id, buyer_id, vendor_id, product_name, quantity, price_per_unit, saved_amount, created_at, priority, status, feedback_notes");

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
      companyMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p.company_name || "Unknown Company" }), {});
    }
  }

  // Enhance deals list
  const enhancedDeals = deals.map(d => {
    const oppositeId = isBuyer ? d.vendor_id : d.buyer_id;
    let virtualStatus = d.status || "negotiation";
    if (d.feedback_notes && d.feedback_notes.startsWith("SIG_STATE:")) {
      const stateStr = d.feedback_notes.replace("SIG_STATE:", "");
      if (stateStr === "cancelled" || stateStr === "buyer_signed" || stateStr === "vendor_signed") {
        virtualStatus = stateStr;
      }
    }
    return {
      ...d,
      partyName: companyMap[oppositeId] || (isBuyer ? "Vendor Partner" : "Buyer Partner"),
      status: virtualStatus
    };
  });

  const statusLabels: Record<string, string> = {
    inquiry: "Inquiry",
    proposal: "Proposal",
    negotiation: "Negotiation",
    buyer_signed: "Buyer Signed",
    vendor_signed: "Vendor Signed",
    closed: "Finalized",
    cancelled: "Cancelled"
  };

  const statusStyles: Record<string, string> = {
    inquiry: "bg-neutral-100 text-neutral-600 border-neutral-200",
    proposal: "bg-blue-50 text-blue-800 border-blue-200/50",
    negotiation: "bg-[#E8A838]/10 text-[#E8A838] border-[#E8A838]/20",
    buyer_signed: "bg-purple-50 text-purple-800 border-purple-200",
    vendor_signed: "bg-indigo-50 text-indigo-800 border-indigo-200",
    closed: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cancelled: "bg-red-50 text-red-800 border-red-200"
  };

  const activeDeals = enhancedDeals.filter(d => d.status !== "closed" && d.status !== "cancelled");
  const finalizedDeals = enhancedDeals.filter(d => d.status === "closed");
  const cancelledDeals = enhancedDeals.filter(d => d.status === "cancelled");

  const renderDealsTable = (list: typeof enhancedDeals, type: 'active' | 'finalized' | 'cancelled') => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#faf8f5]/30 text-neutral-500 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Initiated Date</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Procured Item</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">{isBuyer ? "Supplier Partner" : "Client"}</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Quantity</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Total Bid</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-[#0F1E3C]">Stage</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right text-[#0F1E3C]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {list.map((deal) => {
              const dateFormatted = new Date(deal.created_at).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric"
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
                          Priority: {deal.priority.replace("_", "")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-semibold text-[#0F1E3C]">
                    {deal.partyName}
                  </td>
                  <td className="px-6 py-5 text-neutral-600 text-xs">
                    {deal.quantity.toLocaleString()} units
                  </td>
                  <td className="px-6 py-5 font-bold text-[#0F1E3C] text-xs">
                    ₹{totalVal.toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusStyles[deal.status] || statusStyles['negotiation']}`}>
                      {statusLabels[deal.status] || deal.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Link
                      href={`/dashboard/deals/${deal.id}`}
                      className={`inline-block px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer ${
                        type === 'finalized' 
                          ? "bg-emerald-800 hover:bg-emerald-950" 
                          : type === 'cancelled'
                          ? "bg-neutral-500 hover:bg-neutral-600"
                          : "bg-[#0F1E3C] hover:bg-[#1A315C]"
                      }`}
                    >
                      {type === 'finalized' ? "View Summary" : type === 'cancelled' ? "View Log" : "Enter Room"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl text-[#0F1E3C] tracking-tight">Active Deal Rooms</h1>
        <p className="text-sm text-[#6B7280] mt-2">
          Manage contract proposals, communicate with counterparties, and review AI bidding suggestions.
        </p>
      </div>

      {enhancedDeals.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)] p-16 text-center space-y-4">
          <div className="text-3xl">🤝</div>
          <h3 className="text-sm font-bold text-[#0F1E3C]">No negotiations active</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            {isBuyer 
              ? "Click 'Negotiate' on a vendor card from the Compare Vendors tab to open a direct negotiation room with a supplier." 
              : "Awaiting incoming bids. Keep your service areas and catalogues up to date to matching request parameters."}
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
        <div className="space-y-8">
          {/* Active Negotiations Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)] animate-fade-in">
            <div className="p-5 border-b border-neutral-200 bg-[#faf8f5]/60 flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">Active Negotiations</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-[#0F1E3C]/10 text-[#0F1E3C] rounded-full">
                {activeDeals.length}
              </span>
            </div>
            {activeDeals.length === 0 ? (
              <div className="p-10 text-center text-xs font-medium text-neutral-500">
                No active negotiations. Finalized or cancelled deals are listed below.
              </div>
            ) : (
              renderDealsTable(activeDeals, 'active')
            )}
          </div>

          {/* Finalized Deals Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)] animate-fade-in">
            <div className="p-5 border-b border-neutral-200 bg-emerald-50/45 flex items-center justify-between">
              <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Finalized & Signed Contracts</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                {finalizedDeals.length}
              </span>
            </div>
            {finalizedDeals.length === 0 ? (
              <div className="p-10 text-center text-xs font-medium text-neutral-500">
                No finalized contracts yet. Deals transition here once signed and completed.
              </div>
            ) : (
              renderDealsTable(finalizedDeals, 'finalized')
            )}
          </div>

          {/* Cancelled Negotiations Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-[0_4px_25px_rgb(15,30,60,0.01)] animate-fade-in">
            <div className="p-5 border-b border-neutral-200 bg-red-50/40 flex items-center justify-between">
              <h2 className="text-xs font-bold text-red-800 uppercase tracking-wider">Cancelled Negotiations</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-800 rounded-full">
                {cancelledDeals.length}
              </span>
            </div>
            {cancelledDeals.length === 0 ? (
              <div className="p-10 text-center text-xs font-medium text-neutral-500">
                No cancelled negotiations.
              </div>
            ) : (
              renderDealsTable(cancelledDeals, 'cancelled')
            )}
          </div>
        </div>
      )}
    </div>
  );
}
