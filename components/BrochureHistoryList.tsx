"use client";

import { useState } from "react";

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

type BrochureUpload = {
  id: string;
  file_name: string;
  file_size: string;
  parsed_data: any;
  created_at: string;
};

type BrochureHistoryListProps = {
  initialUploads: BrochureUpload[];
  error?: string;
};

export default function BrochureHistoryList({ initialUploads, error }: BrochureHistoryListProps) {
  const [selectedUpload, setSelectedUpload] = useState<BrochureUpload | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : initialUploads.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-sm">
            You haven't uploaded any brochures yet.
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {initialUploads.map((upload) => (
              <li
                key={upload.id}
                onClick={() => setSelectedUpload(upload)}
                className="p-5 flex items-center justify-between hover:bg-stone-50/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-lg flex items-center justify-center text-lg">
                    {upload.file_name.toLowerCase().endsWith(".csv") ? "📊" : upload.file_name.toLowerCase().endsWith(".pdf") ? "📕" : "🖼️"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 text-sm truncate">
                      {upload.file_name.replace(/^\d+-/, "")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                      <span>{upload.file_size || "Unknown Size"}</span>
                      <span>&middot;</span>
                      <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#0F1E3C] bg-[#0F1E3C]/5 px-2.5 py-1 rounded-full hover:bg-[#0F1E3C]/10 transition-colors">
                  View parsed data &rarr;
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal / Pop View */}
      {selectedUpload && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {selectedUpload.file_name.toLowerCase().endsWith(".csv") ? "📊" : selectedUpload.file_name.toLowerCase().endsWith(".pdf") ? "📕" : "🖼️"}
                </span>
                <div>
                  <h3 className="font-bold text-stone-950 text-base md:text-lg">
                    {selectedUpload.file_name.replace(/^\d+-/, "")}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Uploaded on {new Date(selectedUpload.created_at).toLocaleString()} · Size: {selectedUpload.file_size}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUpload(null)}
                className="text-stone-400 hover:text-stone-600 p-2 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full min-w-max text-sm text-left">
                  <thead className="bg-[#faf8f5] text-stone-600 border-b border-stone-200 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 text-stone-900">Product Name</th>
                      <th className="px-4 py-3.5 text-stone-900">Category</th>
                      <th className="px-4 py-3.5 text-stone-900">Price (₹)</th>
                      <th className="px-4 py-3.5 text-stone-900">Warranty (mo)</th>
                      <th className="px-4 py-3.5 text-stone-900">Delivery (days)</th>
                      <th className="px-4 py-3.5 text-stone-900">MOQ</th>
                      <th className="px-4 py-3.5 text-stone-900">Stock</th>
                      <th className="px-4 py-3.5 text-stone-900">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800 font-normal">
                    {getProducts(selectedUpload.parsed_data).map((product, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-stone-900">
                          {getVal(product.product_name)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600 uppercase tracking-wider">
                            {getVal(product.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums text-stone-900">
                          {product.price !== undefined && product.price !== null && getVal(product.price) !== "—" ? `₹${Number(getVal(product.price)).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{getVal(product.warranty_months)}</td>
                        <td className="px-4 py-3 tabular-nums">{getVal(product.delivery_days)}</td>
                        <td className="px-4 py-3 tabular-nums">{getVal(product.moq)}</td>
                        <td className="px-4 py-3 tabular-nums">{getVal(product.stock)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 font-medium text-amber-700 bg-amber-50 border border-amber-200/50 rounded text-xs">
                            {getVal(product.rating)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
              <button
                onClick={() => setSelectedUpload(null)}
                className="px-5 py-2.5 bg-[#0F1E3C] text-white hover:bg-[#1A315C] rounded-xl font-semibold text-sm transition-all cursor-pointer shadow"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
