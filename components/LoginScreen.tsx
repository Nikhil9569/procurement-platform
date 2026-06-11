"use client";

import { useState } from "react";
import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr] bg-[#faf8f5]">
      {/* LEFT — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0c0a09] p-12 text-stone-200">
        {/* warm glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 25% 20%, rgba(194,90,40,0.28), transparent 70%), radial-gradient(50% 50% at 90% 90%, rgba(180,120,60,0.18), transparent 70%)",
          }}
        />
        {/* grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative animate-[fadeUp_0.6s_ease-out_both]">
          <span className="text-sm font-medium tracking-[0.2em] text-stone-400">
            PROCURE<span className="text-[#e2814e]">·</span>AI
          </span>
        </div>

        <div className="relative max-w-md">
          <h1
            className={`${fraunces.className} text-5xl leading-[1.05] text-stone-50 animate-[fadeUp_0.7s_ease-out_0.1s_both]`}
          >
            Procurement,
            <br />
            <span className="italic text-[#e2814e]">decided</span> in minutes.
          </h1>
          <p className="mt-6 text-stone-400 leading-relaxed animate-[fadeUp_0.7s_ease-out_0.25s_both]">
            Upload a brochure, set your priorities, and let the engine rank the
            right vendor — with every decision explained.
          </p>
        </div>

        <div className="relative flex gap-8 text-xs text-stone-500 animate-[fadeUp_0.7s_ease-out_0.4s_both]">
          <span>AI brochure parsing</span>
          <span>Transparent scoring</span>
          <span>Human-approved deals</span>
        </div>
      </div>

      {/* RIGHT — sign in */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-[fadeUp_0.6s_ease-out_0.2s_both]">
          {/* mobile brand mark */}
          <span className="lg:hidden block mb-10 text-sm font-medium tracking-[0.2em] text-stone-500">
            PROCURE<span className="text-[#c2410c]">·</span>AI
          </span>

          <h2 className={`${fraunces.className} text-3xl text-stone-900`}>
            Welcome
          </h2>
          <p className="mt-2 text-stone-500">
            Sign in to find vendors or list your products.
          </p>

          <button
            onClick={signIn}
            disabled={loading}
            className="group mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-5 py-3.5 font-medium text-stone-800 shadow-sm transition-all hover:border-stone-400 hover:shadow-md active:scale-[0.99] disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "Connecting…" : "Continue with Google"}
          </button>

          <p className="mt-6 text-xs leading-relaxed text-stone-400">
            By continuing you agree to our terms. You&apos;ll choose whether you&apos;re a
            buyer or a vendor right after signing in.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}