"use client";
import { useRouter } from"next/navigation";
import { createClient } from"@/lib/supabase/client";

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
      className="w-full text-center rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 transition-colors text-sm font-medium cursor-pointer"
    >
      Sign out
    </button>
  );
}