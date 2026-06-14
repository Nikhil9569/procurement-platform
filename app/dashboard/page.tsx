import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrochureUpload from "@/components/BrochureUpload";
import BuyerSearch from "@/components/BuyerSearch";
import VendorLocation from "@/components/VendorLocation";

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
    <div className="w-full">
      {profile.role === "vendor" ? (
        <VendorHome />
      ) : (
        <BuyerHome />
      )}
    </div>
  );
}

function VendorHome() {
  return (
    <section className="p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-12">
        <BrochureUpload />
        <VendorLocation />
      </div>
    </section>
  );
}

function BuyerHome() {
  return (
    <section className="p-8 flex flex-col items-center w-full">
      <BuyerSearch />
    </section>
  );
}