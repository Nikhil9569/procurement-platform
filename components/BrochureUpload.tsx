"use client";

import { useState, useRef, DragEvent } from "react";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"] });

const MAX_MB = 10;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export default function BrochureUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
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

    setStatus("done");
    setMessage("Brochure uploaded successfully.");
  };

  const reset = () => { setFile(null); setStatus("idle"); setMessage(""); };
  const sizeKB = file ? (file.size / 1024).toFixed(0) : "";

  return (
    <div className="max-w-xl">
      <h1 className={`${fraunces.className} text-2xl text-stone-900`}>Upload your brochure</h1>
      <p className="mt-2 text-stone-500">
        Drop a PDF or image of your product catalogue. We'll read it and pull out your products automatically.
      </p>

      {status === "done" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl">✓</div>
          <p className="mt-4 font-medium text-stone-800">{message}</p>
          <button onClick={reset} className="mt-4 text-sm font-medium text-[#c2410c] hover:underline">
            Upload another
          </button>
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
            disabled={!file || status === "uploading"}
            className="mt-6 w-full rounded-xl bg-[#0c0a09] px-5 py-3.5 font-medium text-stone-50 transition-all hover:bg-stone-800 active:scale-[0.99] disabled:opacity-40"
          >
            {status === "uploading" ? "Uploading…" : "Upload brochure"}
          </button>
        </>
      )}
    </div>
  );
}