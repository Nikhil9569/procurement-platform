"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-700 hover:border-stone-400"
    >
      Sign out
    </button>
  );
}