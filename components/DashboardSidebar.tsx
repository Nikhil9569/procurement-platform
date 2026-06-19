"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import SignOutButton from "./SignOutButton";

type DashboardSidebarProps = {
  role: string;
  onLinkClick?: () => void;
};

export default function DashboardSidebar({ role, onLinkClick }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const buyerLinks = [
    { name:"Compare Vendors", href:"/dashboard", icon: <Search className="w-5 h-5" /> },
    { name:"Negotiations", href:"/dashboard/deals", icon: <Handshake className="w-5 h-5" /> },
    { name:"Leaderboard", href:"/dashboard/leaderboard", icon: <Trophy className="w-5 h-5" /> },
    { name:"RFQ History", href:"/dashboard/history", icon: <History className="w-5 h-5" /> },
  ];

  const vendorLinks = [
    { name:"Onboarding & Products", href:"/dashboard", icon: <Upload className="w-5 h-5" /> },
    { name:"Negotiations", href:"/dashboard/deals", icon: <Handshake className="w-5 h-5" /> },
    { name:"Awards & History", href:"/dashboard/vendor-history", icon: <History className="w-5 h-5" /> },
  ];

  const links = role ==="buyer" ? buyerLinks : vendorLinks;

  // close the drawer whenever the route changes (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* MOBILE top bar with hamburger (hidden on desktop) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 z-40 bg-white border-b border-stone-200 flex items-center justify-between px-4">
        <span className="text-sm font-medium tracking-[0.2em] text-stone-700">
          PROCURE<span className="text-[#c2410c]">·</span>AI
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* MOBILE backdrop when drawer is open */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR — static on desktop, slide-in drawer on mobile */}
      <aside
        className={`
          bg-white border-r border-stone-200 flex flex-col w-64 shrink-0
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:sticky md:top-0 md:h-screen md:translate-x-0
        `}
      >
        {/* Logo + close button (close only shows on mobile) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-stone-200">
          <span className="text-sm font-medium tracking-[0.2em] text-stone-700">
            PROCURE<span className="text-[#c2410c]">·</span>AI
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#fff7f2] text-[#c2410c] font-medium shadow-[0_0_0_1px_#c2410c]"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer User Info */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/50">
          <div className="flex flex-col gap-1 mb-4 px-2">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{role}</span>
            <span className="text-sm text-stone-900 truncate" title={email}>{email}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
