"use client";

import Link from"next/link";
import { usePathname } from"next/navigation";
import { Search, Handshake, Trophy, History, User, Upload } from"lucide-react";

type DashboardSidebarProps = {
  role: string;
  onLinkClick?: () => void;
};

export default function DashboardSidebar({ role, onLinkClick }: DashboardSidebarProps) {
  const pathname = usePathname();

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

  return (
    <aside className="w-64 bg-white border-r border-neutral-200/80 flex flex-col h-screen sticky top-0 shrink-0 z-20">
      {/* Brand logo header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200/60 bg-white">
        <span className="text-sm font-bold tracking-[0.2em] text-[#0F1E3C]">
          PROCURE<span className="text-[#E8A838]">·</span>AI
        </span>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-400 hover:text-[#0F1E3C] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav Link List */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1.5">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !=="/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-medium ${
                isActive 
                  ?"bg-[#0F1E3C]/5 text-[#0F1E3C] border-l-4 border-[#E8A838] pl-[12px]" 
                  :"text-[#6B7280] hover:bg-neutral-50 hover:text-[#0F1E3C]"
              }`}
            >
              <span className={`shrink-0 ${isActive ?"text-[#0F1E3C]" :"text-[#6B7280]"}`}>
                {link.icon}
              </span>
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
