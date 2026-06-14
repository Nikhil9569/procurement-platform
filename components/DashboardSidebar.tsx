"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

export default function DashboardSidebar({ role, email }: { role: string; email: string }) {
  const pathname = usePathname();

  const buyerLinks = [
    { name: "Compare Vendors", href: "/dashboard", icon: "🔍" },
    { name: "Leaderboard", href: "/dashboard/leaderboard", icon: "🏆" },
    { name: "RFQ History", href: "/dashboard/history", icon: "📜" },
    { name: "Profile", href: "/dashboard/profile", icon: "👤" },
  ];

  const vendorLinks = [
    { name: "Upload Brochure", href: "/dashboard", icon: "📄" },
    { name: "Awards & History", href: "/dashboard/vendor-history", icon: "📜" },
    { name: "Profile", href: "/dashboard/profile", icon: "👤" },
  ];

  const links = role === "buyer" ? buyerLinks : vendorLinks;

  return (
    <aside className="w-64 bg-white border-r border-stone-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-stone-200">
        <span className="text-sm font-medium tracking-[0.2em] text-stone-700">
          PROCURE<span className="text-[#c2410c]">·</span>AI
        </span>
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
  );
}
