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
    <DashboardShell
      role={profile.role}
      email={user.email ||""}
      companyName={profile.company_name ||""}
      userInitial={userInitial}
    >
      {children}
    </DashboardShell>
  );
}
