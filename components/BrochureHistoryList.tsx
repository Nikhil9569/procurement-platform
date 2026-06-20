"use client";

import Link from "next/link";

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
            {initialUploads.map((upload) => {
              const isCsv = upload.file_name.toLowerCase().endsWith(".csv");
              const isPdf = upload.file_name.toLowerCase().endsWith(".pdf");
              return (
                <li key={upload.id} className="hover:bg-stone-50/50 transition-colors">
                  <Link
                    href={`/dashboard/vendor-history/brochure/${upload.id}`}
                    className="p-5 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 shrink-0 bg-stone-100 rounded-lg flex items-center justify-center text-lg">
                        {isCsv ? "📊" : isPdf ? "📕" : "🖼️"}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-stone-950 text-sm truncate">
                          {upload.file_name.replace(/^\d+-/, "")}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500 font-normal">
                          <span>{upload.file_size || "Unknown Size"}</span>
                          <span>&middot;</span>
                          <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0F1E3C] bg-[#0F1E3C]/5 px-2.5 py-1 rounded-full hover:bg-[#0F1E3C]/10 transition-colors">
                      View parsed data &rarr;
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
