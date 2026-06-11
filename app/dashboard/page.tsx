import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import BrochureUpload from "@/components/BrochureUpload";
import BuyerSearch from "@/components/BuyerSearch";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) redirect("/select-role");

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <header className="flex items-center justify-between border-b border-stone-200 px-8 py-4">
        <span className="text-sm font-medium tracking-[0.2em] text-stone-700">
          PROCURE<span className="text-[#c2410c]">·</span>AI
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500 capitalize">
            {profile.role} · {user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      {profile.role === "vendor" ? (
        <VendorHome />
      ) : (
        <BuyerHome />
      )}
    </main>
  );
}

function VendorHome() {
  return (
    <section className="p-8">
      <BrochureUpload />
    </section>
  );
}

import Link from "next/link";

function BuyerHome() {
  return (
    <section className="p-8 flex flex-col items-center">
      <div className="flex justify-end mb-6 max-w-6xl w-full">
        <Link href="/dashboard/history" className="text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-4 py-2 rounded-lg transition-colors shadow-sm">
          View RFQ History & Savings &rarr;
        </Link>
      </div>
      <BuyerSearch />
    </section>
  );
}