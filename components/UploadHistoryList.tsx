"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Image } from "lucide-react";

export default function UploadHistoryList({ uploads }: { uploads: any[] }) {
  const [selectedUpload, setSelectedUpload] = useState<any>(null);

  if (!uploads || uploads.length === 0) {
    return (
      <div className="p-8 text-center text-stone-500 text-sm">
        You haven't uploaded any brochures yet.
      </div>
    );
  }

  const getFileIcon = (fileName: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith('.csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (name.endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    return <Image className="w-5 h-5 text-blue-600" />;
  };

  return (
    <>
      <ul className="divide-y divide-stone-100">
        {uploads.map((upload) => (
          <li 
            key={upload.id} 
            className="p-5 hover:bg-stone-50/50 transition-colors cursor-pointer flex items-center justify-between"
            onClick={() => setSelectedUpload(upload)}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-lg flex items-center justify-center">
                {getFileIcon(upload.file_name)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-stone-900 text-sm truncate">{upload.file_name.replace(/^\d+-/,'')}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                  <span>{upload.file_size || 'Unknown Size'}</span>
                  <span>&middot;</span>
                  <span>{upload.created_at ? new Date(upload.created_at).toLocaleDateString() : 'Unknown Date'}</span>
                  <span>&middot;</span>
                  <span>{(upload.parsed_data || []).length} items</span>
                </div>
              </div>
            </div>
            <span className="text-stone-400">View &rarr;</span>
          </li>
        ))}
      </ul>

      {/* Modal Overlay */}
      {selectedUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-[#faf8f5]">
              <div>
                <h3 className="font-bold text-stone-900 text-lg">{selectedUpload.file_name.replace(/^\d+-/,'')}</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Uploaded on {new Date(selectedUpload.created_at).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedUpload(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-200 text-stone-500 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="overflow-y-auto p-6">
              <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-stone-700">Product Name</th>
                      <th className="px-4 py-3 font-semibold text-stone-700">Category</th>
                      <th className="px-4 py-3 font-semibold text-stone-700">Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(selectedUpload.parsed_data || []).map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="px-4 py-3 font-medium text-stone-900">{p.product_name?.value || '-'}</td>
                        <td className="px-4 py-3 text-stone-600">{p.category?.value || '-'}</td>
                        <td className="px-4 py-3 text-stone-600 tabular-nums">{p.price?.value || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
