import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginScreen from "@/components/LoginScreen";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <LoginScreen />;

  // logged in — check if they've picked a role yet
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) redirect("/select-role");  // no role → choose one
  redirect("/dashboard");                          // has role → dashboard
}