import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    redirect("/select-role");
  }

  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <DashboardSidebar role={profile.role} email={user.email || ""} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
