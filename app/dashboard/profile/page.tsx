"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500"] });

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, contact_email")
        .eq("id", user.id)
        .single();

      if (data) {
        setCompanyName(data.company_name || "");
        setContactEmail(data.contact_email || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: companyName,
        contact_email: contactEmail
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Profile updated successfully!" });
    }
    setSaving(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto animate-[fadeUp_0.4s_ease-out_both]">
      <div className="mb-8">
        <h1 className={`${fraunces.className} text-3xl text-stone-900`}>Your Profile</h1>
        <p className="mt-2 text-stone-500">Manage your company details and contact information.</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-stone-100 rounded-xl w-full"></div>
            <div className="h-10 bg-stone-100 rounded-xl w-full"></div>
            <div className="h-12 bg-stone-200 rounded-xl w-32 mt-6"></div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Company / Business Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-3 bg-white outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-3 bg-white outline-none focus:border-[#c2410c] focus:ring-1 focus:ring-[#c2410c]"
                placeholder="Where should buyers/vendors contact you?"
              />
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-stone-900 text-white font-medium rounded-xl hover:bg-[#c2410c] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
