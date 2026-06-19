import { createClient } from"@/lib/supabase/server";
import { redirect } from"next/navigation";
import Link from"next/link";


export const dynamic ='force-dynamic';

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

  // Get buyer company names
  const buyerIds = [...new Set((awards || []).map(a => a.buyer_id))];
  let buyerMap: Record<string, string> = {};
  if (buyerIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, company_name").in("id", buyerIds);
    if (profiles) profiles.forEach(p => buyerMap[p.id] = p.company_name ||"Unknown Buyer");
  }

  // Fetch Brochure Upload History
  const { data: files, error: filesErr } = await supabase
    .storage
    .from("brochures")
    .list(user.id, {
      limit: 50,
      offset: 0,
      sortBy: { column:'created_at', order:'desc' },
    });

  return (
    <main className="min-h-screen bg-[#faf8f5] p-8">
      <div className="max-w-6xl mx-auto animate-[fadeUp_0.4s_ease-out_both]">
        <div className="flex items-center gap-4 mb-8">
          <h1 className={`text-3xl text-stone-900`}>Vendor History</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Awards Section */}
          <div>
            <h2 className={`text-xl text-stone-900 mb-4 flex items-center gap-2`}>
              <span className="text-[#c2410c]">🏆</span> Won RFQs
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              {awardsErr ? (
                <div className="p-8 text-center text-red-500 text-sm">{awardsErr.message}</div>
              ) : !awards || awards.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-sm">
                  No RFQs won yet. Keep your catalogue updated!
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {awards.map((rfq) => (
                    <li key={rfq.id} className="p-5 hover:bg-stone-50/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-stone-900">{rfq.product_name}</span>
                        <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                          ₹{(rfq.quantity * rfq.price_per_unit).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-end text-sm text-stone-500">
                        <div>
                          <p>Buyer: <span className="font-medium text-stone-700">{buyerMap[rfq.buyer_id] ||"Buyer"}</span></p>
                          <p className="mt-0.5">{rfq.quantity} units @ ₹{rfq.price_per_unit.toLocaleString()}</p>
                        </div>
                        <span className="text-xs">{new Date(rfq.created_at).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Upload History Section */}
          <div>
            <h2 className={`text-xl text-stone-900 mb-4 flex items-center gap-2`}>
              <span className="text-[#c2410c]">📄</span> Brochure Uploads
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              {filesErr ? (
                <div className="p-8 text-center text-red-500 text-sm">{filesErr.message}</div>
              ) : !files || files.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-sm">
                  You haven't uploaded any brochures yet.
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {files.map((file) => (
                    <li key={file.id} className="p-5 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-lg flex items-center justify-center text-lg">
                          {file.name.toLowerCase().endsWith('.csv') ?'📊' : file.name.toLowerCase().endsWith('.pdf') ?'📕' :'🖼️'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 text-sm truncate">{file.name.replace(/^\d+-/,'')}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                            <span>{file.metadata?.size ? (file.metadata.size / 1024).toFixed(0) +' KB' :'Unknown Size'}</span>
                            <span>&middot;</span>
                            <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() :'Unknown Date'}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
