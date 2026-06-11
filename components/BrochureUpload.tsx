"use client";

import { useState, useRef, DragEvent, useMemo } from "react";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

const MAX_MB = 10;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/csv"];

type ExtractedField<T> = {
  value: T;
  confidence: "high" | "medium" | "low";
};

type ProductRow = {
  product_name: ExtractedField<string>;
  category: ExtractedField<string>;
  price: ExtractedField<number>;
  warranty_months: ExtractedField<number | null>;
  delivery_days: ExtractedField<number | null>;
  moq: ExtractedField<number | null>;
  stock: ExtractedField<number | null>;
};

function ConfidenceDot({ level }: { level: string }) {
  if (level === "high") return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 shrink-0" title="High confidence" />;
  if (level === "medium") return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 shrink-0" title="Medium confidence" />;
  if (level === "low") return <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2 shrink-0" title="Low confidence" />;
  return <span className="inline-block w-2 h-2 mr-2 shrink-0" />;
}

export default function BrochureUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "extracting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);

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

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("brochures").upload(path, file);
    if (error) { setStatus("error"); setMessage(error.message); return; }
    
    setUploadedPath(path);

    // extract with Gemini
    setStatus("extracting"); setMessage("");
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus("error"); setMessage(data.error || "Extraction failed"); return; }

    setProducts(data.products || []);
    setStatus("done");
    setMessage("");
  };

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const texts = products.map(p => `Category: ${p.category.value}, Product: ${p.product_name.value}`);
    let embeddings: number[][] = [];
    try {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to embed");
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
      embedding: embeddings[i] || null,
    }));
    
    const { error } = await supabase.from("vendor_catalog").insert(rows);
    setSaving(false);
    if (!error) setSaved(true);
    else setMessage(error.message);
  };

  const reset = async () => {
    if (uploadedPath && !saved) {
      // Clean up orphaned file
      await supabase.storage.from("brochures").remove([uploadedPath]);
    }
    setFile(null); setStatus("idle"); setMessage("");
    setProducts([]); setSaved(false); setUploadedPath(null);
  };

  const updateProduct = (index: number, key: keyof ProductRow, val: string | number | null) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [key]: { ...newProducts[index][key], value: val } };
    setProducts(newProducts);
  };

  const sizeKB = file ? (file.size / 1024).toFixed(0) : "";

  return (
    <div className="max-w-4xl">
      <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Upload your brochure</h1>
      <p className="mt-2 text-stone-500">
        Drop a PDF, image, or CSV of your product catalogue. We&apos;ll read it and pull out your products automatically.
      </p>

      {status === "done" ? (
        <div className="mt-6">
          <h2 className={`${fraunces.className} text-xl text-stone-900`}>
            We found {products.length} product{products.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Review the details before saving. You can click to edit any mistakes. 
            <span className="ml-3 inline-flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5"/> High</span>
            <span className="ml-3 inline-flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5"/> Medium</span>
            <span className="ml-3 inline-flex items-center"><span className="w-2 h-2 rounded-full bg-red-400 mr-1.5"/> Low confidence</span>
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 font-medium min-w-[200px]">Product</th>
                  <th className="px-4 py-3 font-medium min-w-[140px]">Category</th>
                  <th className="px-4 py-3 font-medium w-28">Price (₹)</th>
                  <th className="px-4 py-3 font-medium w-28">Warranty (mo)</th>
                  <th className="px-4 py-3 font-medium w-28">Delivery (days)</th>
                  <th className="px-4 py-3 font-medium w-24">MOQ</th>
                  <th className="px-4 py-3 font-medium w-24">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p, i) => (
                  <tr key={i} className="text-stone-800 transition-colors hover:bg-stone-50/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.product_name?.confidence} />
                        <input 
                          type="text" 
                          value={p.product_name?.value || ""} 
                          onChange={(e) => updateProduct(i, "product_name", e.target.value)}
                          className="w-full bg-transparent outline-none font-medium text-stone-900 placeholder:text-stone-300"
                          placeholder="Product Name"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.category?.confidence} />
                        <input 
                          type="text" 
                          value={p.category?.value || ""} 
                          onChange={(e) => updateProduct(i, "category", e.target.value)}
                          className="w-full bg-transparent outline-none text-xs text-stone-600 uppercase tracking-wider"
                          placeholder="Category"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.price?.confidence} />
                        <input 
                          type="number" 
                          value={p.price?.value ?? ""} 
                          onChange={(e) => updateProduct(i, "price", e.target.value ? Number(e.target.value) : 0)}
                          className="w-full bg-transparent outline-none tabular-nums"
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.warranty_months?.confidence} />
                        <input 
                          type="number" 
                          value={p.warranty_months?.value ?? ""} 
                          onChange={(e) => updateProduct(i, "warranty_months", e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-transparent outline-none tabular-nums"
                          placeholder="—"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.delivery_days?.confidence} />
                        <input 
                          type="number" 
                          value={p.delivery_days?.value ?? ""} 
                          onChange={(e) => updateProduct(i, "delivery_days", e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-transparent outline-none tabular-nums"
                          placeholder="—"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.moq?.confidence} />
                        <input 
                          type="number" 
                          value={p.moq?.value ?? ""} 
                          onChange={(e) => updateProduct(i, "moq", e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-transparent outline-none tabular-nums"
                          placeholder="—"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center bg-white rounded border border-transparent focus-within:border-[#c2410c] focus-within:ring-1 focus-within:ring-[#c2410c]/20 px-1 py-0.5">
                        <ConfidenceDot level={p.stock?.confidence || 'high'} />
                        <input 
                          type="number" 
                          value={p.stock?.value ?? ""} 
                          onChange={(e) => updateProduct(i, "stock", e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-transparent outline-none tabular-nums"
                          placeholder="—"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {saved ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
              ✓ {products.length} product{products.length !== 1 ? "s" : ""} added to your catalogue.
              <button onClick={reset} className="ml-3 font-medium text-[#c2410c] hover:underline">
                Upload another
              </button>
            </div>
          ) : (
            <div className="mt-5 flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-[#0c0a09] px-5 py-3 font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save to catalogue"}
              </button>
              <button onClick={reset} className="rounded-xl border border-stone-300 px-5 py-3 font-medium text-stone-700 hover:border-stone-400 bg-white transition-colors">
                Start over
              </button>
            </div>
          )}

          {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        </div>
      ) : (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all
              ${dragging ? "border-[#c2410c] bg-[#fff7f2]" : "border-stone-300 bg-white hover:border-stone-400 hover:shadow-sm"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,.csv"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-2xl text-stone-400">↑</div>
            <p className="mt-4 text-stone-700">
              <span className="font-medium text-[#c2410c]">Click to browse</span> or drag a file here
            </p>
            <p className="mt-1 text-xs text-stone-400">PDF, PNG, JPG, WEBP, or CSV · up to {MAX_MB}MB</p>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 text-sm font-medium">
                  {file.name.toLowerCase().endsWith('.csv') ? 'CSV' : file.type === "application/pdf" ? "PDF" : "IMG"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{file.name}</p>
                  <p className="text-xs text-stone-400">{sizeKB} KB</p>
                </div>
              </div>
              <button onClick={reset} className="text-stone-400 hover:text-stone-700 px-2 transition-colors">✕</button>
            </div>
          )}

          {message && status === "error" && (
            <p className="mt-3 text-sm text-red-600">{message}</p>
          )}

          <button
            onClick={upload}
            disabled={!file || status === "uploading" || status === "extracting"}
            className="mt-6 w-full rounded-xl bg-[#0c0a09] px-5 py-3.5 font-medium text-stone-50 transition-all hover:bg-stone-800 active:scale-[0.99] disabled:opacity-40"
          >
            {status === "uploading" ? "Uploading…" : status === "extracting" ? "Reading your brochure…" : "Upload brochure"}
          </button>
        </>
      )}
    </div>
  );
}