"use client";

import { useState, useRef, DragEvent, useMemo, useEffect } from"react";
import { createClient } from"@/lib/supabase/client";

const MAX_MB = 10;
const ACCEPTED = ["application/pdf","image/png","image/jpeg","image/webp","text/csv"];

type ExtractedField<T> = {
  value: T;
  confidence:"high" |"medium" |"low";
};

export type ProductRow = {
  product_name: ExtractedField<string>;
  category: ExtractedField<string>;
  price: ExtractedField<number>;
  warranty_months: ExtractedField<number | null>;
  delivery_days: ExtractedField<number | null>;
  moq: ExtractedField<number | null>;
  stock: ExtractedField<number | null>;
  rating: ExtractedField<number | null>;
};

type BrochureUploadProps = {
  step: 1 | 3;
  initialProducts?: ProductRow[];
  uploadedPath?: string | null;
  fileDetails?: { name: string; size: string } | null;
  onUploadComplete: (products: ProductRow[], path: string, fileInfo: { name: string; size: string }) => void;
  onPublishComplete: () => void;
  onBack?: () => void;
};

function ConfidenceBadge({ level }: { level: string }) {
  if (level ==="high") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
        High
      </span>
    );
  }
  if (level ==="medium") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
        Medium
      </span>
    );
  }
  if (level ==="low") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/50">
        Low
      </span>
    );
  }
  return null;
}

export default function BrochureUpload({
  step,
  initialProducts = [],
  uploadedPath = null,
  fileDetails = null,
  onUploadComplete,
  onPublishComplete,
  onBack
}: BrochureUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" |"uploading" |"extracting" |"done" |"error">("idle");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeUploadedPath, setActiveUploadedPath] = useState<string | null>(uploadedPath);
  const [showConfidence, setShowConfidence] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !f.name.toLowerCase().endsWith('.csv')) {
      setStatus("error"); setMessage("Please upload a PDF, image, or CSV file."); return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setStatus("error"); setMessage(`File must be under ${MAX_MB}MB.`); return;
    }
    setFile(f); setStatus("idle"); setMessage("");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const upload = async () => {
    if (!file) return;
    setStatus("uploading"); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("error"); setMessage("Session expired — sign in again."); return; }

    const path =`${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("brochures").upload(path, file);
    if (error) { setStatus("error"); setMessage(error.message); return; }
    
    setActiveUploadedPath(path);

    // Extract with Gemini
    setStatus("extracting"); setMessage("");
    try {
      const res = await fetch("/api/extract", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); setMessage(data.error ||"Extraction failed"); return; }

      const extracted = data.products || [];
      setProducts(extracted);
      setStatus("done");
      setMessage("");

      // Pass completion to parent stepper
      onUploadComplete(extracted, path, {
        name: file.name,
        size: (file.size / 1024).toFixed(0) +" KB"
      });
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message ||"Failed to extract catalog.");
    }
  };

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const texts = products.map(p => {
      const details = [
        `Category: ${p.category.value}`,
        `Product: ${p.product_name.value}`,
        p.price.value ? `Price: ₹${p.price.value}` : null,
        p.warranty_months.value ? `Warranty: ${p.warranty_months.value} months` : null,
        p.delivery_days.value ? `Delivery time: ${p.delivery_days.value} days` : null,
        p.moq.value ? `Minimum Order Quantity (MOQ): ${p.moq.value} units` : null,
        p.stock?.value ? `Stock availability: ${p.stock.value} units` : null,
        p.rating?.value ? `Rating: ${p.rating.value} stars` : null
      ].filter(Boolean).join(", ");
      return details;
    });
    let embeddings: number[][] = [];
    try {
      const res = await fetch("/api/embed", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({ texts })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ||"Failed to embed");
      embeddings = data.embeddings;
    } catch(e: any) {
      setMessage(e.message);
      setSaving(false);
      return;
    }

    const rows = products.map((p, i) => ({
      vendor_id: user.id,
      product_name: p.product_name.value,
      category: p.category.value,
      price: p.price.value,
      warranty_months: p.warranty_months.value,
      delivery_days: p.delivery_days.value,
      moq: p.moq.value,
      stock: p.stock?.value || null,
      rating: p.rating?.value || null,
      embedding: embeddings[i] || null,
    }));
    
    // 1. Delete old active catalog to prevent duplicates
    const { error: deleteErr } = await supabase
      .from("vendor_catalog")
      .delete()
      .eq("vendor_id", user.id);

    if (deleteErr) {
      setSaving(false);
      setMessage("Failed to clear old catalog: " + deleteErr.message);
      return;
    }

    // 2. Insert new active catalog
    const { error } = await supabase.from("vendor_catalog").insert(rows);
    if (!error) {
      // Save details to brochure_uploads table for history page modal viewing
      await supabase.from("brochure_uploads").insert({
        vendor_id: user.id,
        file_name: file?.name || fileDetails?.name || activeUploadedPath?.split('/').pop() || "Uploaded Brochure",
        file_path: activeUploadedPath || uploadedPath || "",
        file_size: file ? `${(file.size / 1024).toFixed(0)} KB` : (fileDetails?.size || "Unknown Size"),
        parsed_data: products
      });

      setSaved(true);
      setSaving(false);
    } else {
      setSaving(false);
      setMessage(error.message);
    }
  };

  const reset = async () => {
    if (activeUploadedPath && !saved) {
      await supabase.storage.from("brochures").remove([activeUploadedPath]);
    }
    setFile(null); setStatus("idle"); setMessage("");
    setProducts([]); setSaved(false); setActiveUploadedPath(null);
  };

  const updateProduct = (index: number, key: keyof ProductRow, val: string | number | null) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [key]: { ...newProducts[index][key], value: val } };
    setProducts(newProducts);
  };

  const sizeKB = file ? (file.size / 1024).toFixed(0) :"";

  // Render Step 1: Upload Dropzone
  if (step === 1) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#0F1E3C] tracking-tight">Upload Product Catalogue</h2>
          <p className="text-sm text-[#6B7280] mt-1">
            Drag and drop your brochure, brochure images, or pricing spreadsheets. Our AI engine will extract and construct your catalog.
          </p>
        </div>

        {status !=="uploading" && status !=="extracting" ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[240px]
                ${dragging 
                  ?"border-[#E8A838] bg-[#E8A838]/5" 
                  :"border-neutral-300 bg-white hover:border-[#0F1E3C]/40 hover:bg-neutral-50/50"}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp,.csv"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 mb-4">
                <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5-5 5 5m-5-5v12"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#0F1E3C]">
                Click to browse files or drag and drop
              </p>
              <p className="text-xs text-[#6B7280] mt-1.5">
                PDF, PNG, JPG, WEBP, or CSV · max {MAX_MB}MB
              </p>
            </div>

            {file && (
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F1E3C]/5 text-[#0F1E3C] text-xs font-bold">
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0F1E3C]">{file.name}</p>
                    <p className="text-xs text-[#6B7280]">{sizeKB} KB</p>
                  </div>
                </div>
                <button onClick={reset} className="text-neutral-400 hover:text-[#0F1E3C] px-2 transition-colors cursor-pointer">
                  ✕
                </button>
              </div>
            )}

            {message && status ==="error" && (
              <p className="text-sm font-semibold text-red-600 animate-fade-in">{message}</p>
            )}

            <button
              onClick={upload}
              disabled={!file}
              className="w-full rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-5 py-4 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              Parse Catalogue with AI &rarr;
            </button>
          </>
        ) : (
          /* Extraction Loading Screen */
          <div className="border border-neutral-200 bg-white rounded-2xl overflow-hidden shadow-sm p-8 flex flex-col items-center justify-center text-center py-16 animate-fade-in">
            <div className="relative flex items-center justify-center mb-6">
              <span className="flex h-12 w-12 rounded-full border-4 border-neutral-100 border-t-[#E8A838] animate-spin" />
              <span className="absolute text-lg">✨</span>
            </div>
            <h3 className="text-lg font-bold text-[#0F1E3C] tracking-tight">
              {status ==="uploading" ?"Uploading Brochure..." :"AI Reading & Extracting Products..."}
            </h3>
            <p className="text-sm text-[#6B7280] mt-2 max-w-sm mx-auto leading-relaxed">
              We are geolocating products, parsing descriptions, categorizing specs, and running embeddings matching.
            </p>
            
            <div className="w-full max-w-md mt-10 space-y-4 text-left">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 rounded-xl border border-neutral-100 bg-[#faf8f5]/50 animate-pulse" style={{ animationDelay:`${i * 150}ms` }}>
                  <div className="h-4 bg-neutral-200 rounded w-1/3" />
                  <div className="h-3 bg-neutral-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Step 3: Review & Publish
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F1E3C] tracking-tight">Review & Edit Catalog</h2>
          <p className="text-sm text-[#6B7280] mt-1">
            Review the {products.length} products found by our AI model. Tap any field to override prices, warranty specs, or stock counts.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-[#faf8f5] border border-neutral-200 rounded-lg px-3 py-1.5 w-fit">
          <span className="text-xs font-bold text-[#0F1E3C] uppercase tracking-wider">AI Confidence</span>
          <button
            type="button"
            onClick={() => setShowConfidence(!showConfidence)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showConfidence ? "bg-[#0F1E3C]" : "bg-neutral-300"
            }`}
            role="switch"
            aria-checked={showConfidence}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showConfidence ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-max text-sm text-left">
          <thead className="bg-[#faf8f5] text-neutral-500 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[320px] text-[#0F1E3C]">Product Name</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[180px] text-[#0F1E3C]">Category</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[140px] text-[#0F1E3C]">Price (₹)</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[140px] text-[#0F1E3C]">Warranty (mo)</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[145px] text-[#0F1E3C]">Delivery (days)</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[120px] text-[#0F1E3C]">MOQ</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[120px] text-[#0F1E3C]">Stock</th>
              <th className="px-4 py-4 font-bold text-xs uppercase tracking-wider min-w-[120px] text-[#0F1E3C]">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {products.map((p, i) => (
              <tr key={i} className="text-neutral-800 transition-colors hover:bg-neutral-50/50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.product_name?.confidence} />}
                    <input 
                      type="text" 
                      value={p.product_name?.value ||""} 
                      onChange={(e) => updateProduct(i,"product_name", e.target.value)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-[#0F1E3C]"
                      placeholder="Product Name"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.category?.confidence} />}
                    <select 
                      value={p.category?.value ||"Other"} 
                      onChange={(e) => updateProduct(i,"category", e.target.value)}
                      className="flex-1 min-w-0 bg-transparent outline-none text-xs text-[#0F1E3C] uppercase tracking-wider appearance-none cursor-pointer font-bold"
                    >
                      {["Laptops","Desktops","Monitors","Keyboards","Mice","Storage","Networking","Accessories","Other"].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.price?.confidence} />}
                    <input 
                      type="number" 
                      value={p.price?.value ??""} 
                      onChange={(e) => updateProduct(i,"price", e.target.value ? Number(e.target.value) : 0)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.warranty_months?.confidence} />}
                    <input 
                      type="number" 
                      value={p.warranty_months?.value ??""} 
                      onChange={(e) => updateProduct(i,"warranty_months", e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                      placeholder="—"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.delivery_days?.confidence} />}
                    <input 
                      type="number" 
                      value={p.delivery_days?.value ??""} 
                      onChange={(e) => updateProduct(i,"delivery_days", e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                      placeholder="—"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.moq?.confidence} />}
                    <input 
                      type="number" 
                      value={p.moq?.value ??""} 
                      onChange={(e) => updateProduct(i,"moq", e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                      placeholder="—"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.stock?.confidence ||'high'} />}
                    <input 
                      type="number" 
                      value={p.stock?.value ??""} 
                      onChange={(e) => updateProduct(i,"stock", e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                      placeholder="—"
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 bg-white rounded border border-transparent focus-within:border-[#0F1E3C] focus-within:ring-2 focus-within:ring-[#0F1E3C]/10 px-2 py-1.5">
                    {showConfidence && <ConfidenceBadge level={p.rating?.confidence} />}
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="5"
                      value={p.rating?.value ??""} 
                      onChange={(e) => updateProduct(i,"rating", e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 min-w-0 bg-transparent outline-none font-medium tabular-nums"
                      placeholder="—"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-100 justify-between">
          <div className="flex gap-2">
            {onBack && (
              <button 
                onClick={onBack}
                className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-600 hover:border-neutral-400 bg-white transition-colors cursor-pointer text-sm"
              >
                &larr; Back to Location
              </button>
            )}
            <button 
              onClick={reset}
              className="rounded-xl border border-neutral-200 hover:bg-neutral-50 px-5 py-3 font-semibold text-neutral-500 transition-colors cursor-pointer text-sm"
            >
              Start Over
            </button>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-[#0F1E3C] hover:bg-[#1A315C] px-6 py-3 font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer text-sm"
          >
            {saving ?"Publishing Catalogue..." :"Publish Catalogue"}
          </button>
        </div>

      {/* Confirmation Modal */}
      {saved && (
        <div className="fixed inset-0 bg-black/35 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 text-xl font-bold mb-4 shadow-inner">
              ✓
            </div>
            <h3 className="text-lg font-bold text-stone-900">Catalog Published</h3>
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">
              Successfully saved {products.length} products to your workspace catalog!
            </p>
            <button
              onClick={() => setSaved(false)}
              className="mt-6 w-full py-2.5 bg-[#0F1E3C] hover:bg-[#1A315C] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm font-medium text-red-600 animate-fade-in">{message}</p>}
    </div>
  );
}