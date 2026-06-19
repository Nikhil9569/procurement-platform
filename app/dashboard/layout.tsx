import { redirect } from"next/navigation";
import { createClient } from"@/lib/supabase/server";
import DashboardShell from"@/components/DashboardShell";

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
    .select("role, company_name")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    redirect("/select-role");
  }

  const userInitial = user.email ? user.email.charAt(0).toUpperCase() :"U";

  return (
    <div className="flex min-h-screen bg-[#faf8f5]">
      <DashboardSidebar role={profile.role} email={user.email || ""} />
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
