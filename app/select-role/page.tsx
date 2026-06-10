"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function SelectRole() {
  const [step, setStep] = useState<"role" | "company">("role");
  const [role, setRole] = useState<"buyer" | "vendor" | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const pickRole = (r: "buyer" | "vendor") => {
    setRole(r);
    setStep("company");
  };

  const save = async () => {
    if (!companyName.trim()) { setError("Please enter your company name."); return; }
    if (!role) return;
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/");

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ role, company_name: companyName.trim() })
      .eq("id", user.id);

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl text-center animate-[fadeUp_0.6s_ease-out_both]">

        {step === "role" ? (
          <>
            <h1 className={`${fraunces.className} text-4xl text-stone-900`}>
              How will you use the platform?
            </h1>
            <p className="mt-3 text-stone-500">
              This sets up your workspace. You can&apos;t switch later, so pick the one that fits.
            </p>
            <div className="mt-10 grid sm:grid-cols-2 gap-5">
              <RoleCard
                title="I'm a Buyer"
                desc="Find and compare vendors, get AI recommendations, and place orders."
                onClick={() => pickRole("buyer")}
              />
              <RoleCard
                title="I'm a Vendor"
                desc="Upload your brochure, list products, and receive buyer requests."
                onClick={() => pickRole("vendor")}
              />
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep("role"); setError(""); }}
              className="mb-8 text-sm text-[#c2410c] hover:underline"
            >
              &larr; Change role
            </button>
            <h1 className={`${fraunces.className} text-4xl text-stone-900`}>
              What&apos;s your company name?
            </h1>
            <p className="mt-3 text-stone-500">
              {role === "vendor"
                ? "Buyers will see this name when comparing your products."
                : "This will appear in your buyer profile."}
            </p>

            <div className="mt-8 text-left">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Company / Business name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder={role === "vendor" ? "e.g. TechCorp Solutions" : "e.g. Acme Corporation"}
                autoFocus
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3.5 text-stone-900 outline-none focus:border-[#c2410c] focus:ring-2 focus:ring-[#c2410c]/10 transition-all"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
              onClick={save}
              disabled={saving || !companyName.trim()}
              className="mt-6 w-full rounded-xl bg-[#0c0a09] px-6 py-3.5 font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50 active:scale-[0.99] transition-all"
            >
              {saving
                ? "Setting up your workspace\u2026"
                : `Continue as ${role === "vendor" ? "Vendor" : "Buyer"} \u2192`}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from {opacity:0;transform:translateY(12px)} to {opacity:1;transform:translateY(0)} }
      `}</style>
    </main>
  );
}

function RoleCard({ title, desc, onClick }: {
  title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-stone-300 bg-white p-7 text-left transition-all hover:border-[#c2410c] hover:shadow-lg active:scale-[0.99]"
    >
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm text-stone-500 leading-relaxed">{desc}</p>
      <span className="mt-4 inline-block text-sm font-medium text-[#c2410c]">Choose &rarr;</span>
    </button>
  );
}