"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function SelectRole() {
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const choose = async (role: "buyer" | "vendor") => {
    setSaving(role);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/");

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (error) { setSaving(null); return; }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl text-center animate-[fadeUp_0.6s_ease-out_both]">
        <h1 className={`${fraunces.className} text-4xl text-stone-900`}>
          How will you use the platform?
        </h1>
        <p className="mt-3 text-stone-500">
          This sets up your workspace. You can't switch later, so pick the one that fits.
        </p>

        <div className="mt-10 grid sm:grid-cols-2 gap-5">
          <RoleCard
            title="I'm a Buyer"
            desc="Find and compare vendors, get AI recommendations, and place orders."
            onClick={() => choose("buyer")}
            loading={saving === "buyer"}
          />
          <RoleCard
            title="I'm a Vendor"
            desc="Upload your brochure, list products, and receive buyer requests."
            onClick={() => choose("vendor")}
            loading={saving === "vendor"}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from {opacity:0;transform:translateY(12px)} to {opacity:1;transform:translateY(0)} }
      `}</style>
    </main>
  );
}

function RoleCard({ title, desc, onClick, loading }: {
  title: string; desc: string; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group rounded-2xl border border-stone-300 bg-white p-7 text-left transition-all hover:border-[#c2410c] hover:shadow-lg active:scale-[0.99] disabled:opacity-60"
    >
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm text-stone-500 leading-relaxed">{desc}</p>
      <span className="mt-4 inline-block text-sm font-medium text-[#c2410c]">
        {loading ? "Setting up…" : "Choose →"}
      </span>
    </button>
  );
}