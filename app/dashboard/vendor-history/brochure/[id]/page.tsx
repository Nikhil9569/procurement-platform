import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, FileSpreadsheet, Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type ExtractedField<T> = {
  value: T;
  confidence: "high" | "medium" | "low";
};

type ProductRow = {
  product_name: ExtractedField<string> | string;
  category: ExtractedField<string> | string;
  price: ExtractedField<number> | number;
  warranty_months: ExtractedField<number | null> | number | null;
  delivery_days: ExtractedField<number | null> | number | null;
  moq: ExtractedField<number | null> | number | null;
  stock: ExtractedField<number | null> | number | null;
  rating: ExtractedField<number | null> | number | null;
};

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function BrochureDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch specific brochure upload
  const { data: upload, error } = await supabase
    .from("brochure_uploads")
    .select("*")
    .eq("id", resolvedParams.id)
    .eq("vendor_id", user.id)
    .single();

  if (error || !upload) {
    notFound();
  }

  const getVal = (field: any): string => {
    if (field === null || field === undefined) return "—";
    if (typeof field === "object" && "value" in field) {
      return field.value !== null && field.value !== undefined ? String(field.value) : "—";
    }
    return String(field);
  };

  const getProducts = (parsedData: any): ProductRow[] => {
    if (Array.isArray(parsedData)) return parsedData;
    if (parsedData && typeof parsedData === "object" && Array.isArray(parsedData.products)) {
      return parsedData.products;
    }
    return [];
  };

  const isCsv = upload.file_name.toLowerCase().endsWith(".csv");
  const isPdf = upload.file_name.toLowerCase().endsWith(".pdf");
  const products = getProducts(upload.parsed_data);

  return (
    <main className="min-h-screen bg-[#faf8f5] p-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-[fadeUp_0.4s_ease-out_both]">
        
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard/vendor-history"
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors w-fit text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#0F1E3C] shrink-0 shadow-inner">
                {isCsv ? (
                  <FileSpreadsheet className="w-6 h-6" />
                ) : isPdf ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {upload.file_name.replace(/^\d+-/, "")}
                </h1>
                <p className="text-xs text-stone-500 mt-1">
                  Uploaded on {new Date(upload.created_at).toLocaleString()} · Size: {upload.file_size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6">
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-max text-sm text-left">
              <thead className="bg-[#faf8f5] text-stone-600 border-b border-stone-200 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4 text-stone-900">Product Name</th>
                  <th className="px-4 py-4 text-stone-900">Category</th>
                  <th className="px-4 py-4 text-stone-900">Price (₹)</th>
                  <th className="px-4 py-4 text-stone-900">Warranty (mo)</th>
                  <th className="px-4 py-4 text-stone-900">Delivery (days)</th>
                  <th className="px-4 py-4 text-stone-900">MOQ</th>
                  <th className="px-4 py-4 text-stone-900">Stock</th>
                  <th className="px-4 py-4 text-stone-900">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                      No parsed products found in this upload.
                    </td>
                  </tr>
                ) : (
                  products.map((product, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-stone-900">
                        {getVal(product.product_name)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600 uppercase tracking-wider">
                          {getVal(product.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium tabular-nums text-stone-900">
                        {product.price !== undefined && product.price !== null && getVal(product.price) !== "—" ? `₹${Number(getVal(product.price)).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">{getVal(product.warranty_months)}</td>
                      <td className="px-4 py-3.5 tabular-nums">{getVal(product.delivery_days)}</td>
                      <td className="px-4 py-3.5 tabular-nums">{getVal(product.moq)}</td>
                      <td className="px-4 py-3.5 tabular-nums">{getVal(product.stock)}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 font-medium text-amber-700 bg-amber-50 border border-amber-200/50 rounded text-xs">
                          {getVal(product.rating)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
