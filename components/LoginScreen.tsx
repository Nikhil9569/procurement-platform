"use client";

import { useState } from"react";
import { createClient } from"@/lib/supabase/client";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider:"google",
      options: { redirectTo:`${window.location.origin}/auth/callback` },
    });
    if (error) setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#faf8f5] flex flex-col justify-between overflow-hidden">
      {/* Animated SVG Geometric Grid / Mesh Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <svg className="absolute inset-0 w-full h-full stroke-neutral-300/60 [mask-image:radial-gradient(80%_80%_at_50%_40%,white,transparent)]" aria-hidden="true">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse" x="-10" y="-10">
              <path d="M.5 50V.5H50" fill="none" strokeWidth="0.5" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="1.5" className="fill-neutral-400/80" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="animate-grid-drift" />
        </svg>
        {/* Subtle decorative geometric meshes */}
        <svg viewBox="0 0 100 100" className="absolute top-1/4 left-10 w-48 h-48 text-neutral-300/30 stroke-current fill-none stroke-[0.2]" strokeLinecap="round">
          <polygon points="50,15 90,35 90,80 50,95 10,80 10,35" />
          <line x1="50" y1="15" x2="50" y2="95" />
          <line x1="10" y1="35" x2="90" y2="80" />
          <line x1="90" y1="35" x2="10" y2="80" />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute bottom-1/4 right-10 w-64 h-64 text-neutral-300/30 stroke-current fill-none stroke-[0.2]" strokeLinecap="round">
          <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />
          <line x1="50" y1="5" x2="50" y2="95" />
          <line x1="5" y1="25" x2="95" y2="75" />
          <line x1="95" y1="25" x2="5" y2="75" />
        </svg>
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-[0.2em] text-[#0F1E3C]">
            PROCURE<span className="text-[#E8A838]">·</span>AI
          </span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 sm:px-8 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center flex-1">
        
        {/* Left column: Messaging */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left max-w-2xl">
          
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.1] text-[#0F1E3C] tracking-tight animate-fade-up">
            Procurement,
            <br />
            <span className="italic text-[#E8A838]">decided</span> in minutes.
          </h1>
          
          <p className="mt-6 text-lg text-[#6B7280] leading-relaxed max-w-xl animate-fade-up [animation-delay:150ms]">
            Upload a vendor catalogue, outline your business constraints, and let our recommendation engine score the ideal suppliers — with every decision explained.
          </p>
        </div>

        {/* Right column: Login Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full animate-fade-up [animation-delay:300ms]">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/80 p-8 sm:p-10 shadow-[0_8px_30px_rgb(15,30,60,0.04)]">
            <h2 className="text-2xl font-bold text-[#0F1E3C] tracking-tight">
              Get Started
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Sign in to run RFQs, analyze vendor profiles, or showcase your catalogue.
            </p>

            <button
              onClick={signIn}
              disabled={loading}
              className="group mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-5 py-4 font-semibold text-[#0F1E3C] shadow-sm transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <GoogleIcon />
              {loading ?"Connecting to Google..." :"Continue with Google"}
            </button>

            <p className="mt-6 text-xs leading-relaxed text-[#6B7280]/80">
              Secured with Supabase Auth. By proceeding, you agree to our terms. You can select your role as a Buyer or a Vendor immediately after sign-in.
            </p>
          </div>
        </div>
      </main>

      {/* Trust Badges Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 sm:px-8 border-t border-neutral-200/50 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 sm:gap-x-12 text-xs font-semibold text-[#0F1E3C]/70 tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <span className="text-[#E8A838] text-sm font-bold">✓</span>
            <span>AI brochure parsing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#E8A838] text-sm font-bold">✓</span>
            <span>Transparent scoring</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#E8A838] text-sm font-bold">✓</span>
            <span>Human-approved deals</span>
          </div>
        </div>
        <p className="text-xs text-[#6B7280] font-medium">
          &copy; {new Date().getFullYear()} Procure AI. All rights reserved.
        </p>
      </footer>

      {/* Grid Drift Animation CSS */}
      <style>{`
        @keyframes gridDrift {
          0% { background-position: 0px 0px; }
          100% { background-position: 50px 50px; }
        }
        .animate-grid-drift {
          animation: gridDrift 20s linear infinite;
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