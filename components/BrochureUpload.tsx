"use client";

import { useState, useRef, DragEvent } from "react";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

const MAX_MB = 10;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

type Product = {
  product_name: string;
  category: string;
  price: number;
  warranty_months: number | null;
  delivery_days: number | null;
  moq: number | null;
  stock?: number | null;
  embedding?: number[] | null;
};

export default function BrochureUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "extracting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setStatus("error"); setMessage("Please upload a PDF or image file."); return;
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

    const texts = products.map(p => `Category: ${p.category}, Product: ${p.product_name}`);
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
      product_name: p.product_name,
      category: p.category,
      price: p.price,
      warranty_months: p.warranty_months,
      delivery_days: p.delivery_days,
      moq: p.moq,
      stock: p.stock || null,
      embedding: embeddings[i] || null,
    }));
    
    const { error } = await supabase.from("vendor_catalog").insert(rows);
    setSaving(false);
    if (!error) setSaved(true);
    else setMessage(error.message);
  };

  const reset = () => {
    setFile(null); setStatus("idle"); setMessage("");
    setProducts([]); setSaved(false);
  };
  const sizeKB = file ? (file.size / 1024).toFixed(0) : "";

  return (
    <div className="max-w-2xl">
      <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Upload your brochure</h1>
      <p className="mt-2 text-stone-500">
        Drop a PDF or image of your product catalogue. We'll read it and pull out your products automatically.
      </p>

      {status === "done" ? (
        <div className="mt-6">
          <h2 className={`${fraunces.className} text-xl text-stone-900`}>
            We found {products.length} product{products.length !== 1 ? "s" : ""}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Review the details before saving. A field is left blank if the brochure didn't state it.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Warranty</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">MOQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p, i) => (
                  <tr key={i} className="text-stone-800">
                    <td className="px-4 py-3 font-medium">{p.product_name}</td>
                     <td className="px-4 py-3">
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{p.category}</span>
                    </td>
                    <td className="px-4 py-3">₹{p.price}</td>
                    <td className="px-4 py-3">{p.warranty_months ? `${p.warranty_months} mo` : "—"}</td>
                    <td className="px-4 py-3">{p.delivery_days ? `${p.delivery_days} days` : "—"}</td>
                    <td className="px-4 py-3">{p.moq ?? "—"}</td>
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
                className="rounded-xl bg-[#0c0a09] px-5 py-3 font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save to catalogue"}
              </button>
              <button onClick={reset} className="rounded-xl border border-stone-300 px-5 py-3 font-medium text-stone-700 hover:border-stone-400">
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
              ${dragging ? "border-[#c2410c] bg-[#fff7f2]" : "border-stone-300 bg-white hover:border-stone-400"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-2xl text-stone-400">↑</div>
            <p className="mt-4 text-stone-700">
              <span className="font-medium text-[#c2410c]">Click to browse</span> or drag a file here
            </p>
            <p className="mt-1 text-xs text-stone-400">PDF, PNG, JPG or WEBP · up to {MAX_MB}MB</p>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500 text-sm">
                  {file.type === "application/pdf" ? "PDF" : "IMG"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{file.name}</p>
                  <p className="text-xs text-stone-400">{sizeKB} KB</p>
                </div>
              </div>
              <button onClick={reset} className="text-stone-400 hover:text-stone-700 px-2">✕</button>
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