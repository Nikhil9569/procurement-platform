"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Bell, User } from "lucide-react";
import DashboardSidebar from "./DashboardSidebar";
import SignOutButton from "./SignOutButton";

type DashboardShellProps = {
  children: React.ReactNode;
  role: string;
  email: string;
  companyName: string;
  userInitial: string;
};

export default function DashboardShell({
  children,
  role,
  email,
  companyName,
  userInitial,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const emailPrefix = email.split("@")[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ?"translate-x-0" :"-translate-x-full"
        } md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 flex-shrink-0`}
      >
        <DashboardSidebar role={role} onLinkClick={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Modern Top Header Bar */}
        <header className="h-16 border-b border-neutral-200/60 bg-white flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-neutral-500 hover:text-[#0F1E3C] rounded-lg hover:bg-neutral-50 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-gray-900 tracking-wide uppercase hidden sm:block">
              {companyName ||"Workspace"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="p-2 text-neutral-400 hover:text-[#0F1E3C] rounded-lg hover:bg-neutral-50 transition-colors relative cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8A838] rounded-full ring-2 ring-white" />
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-neutral-200" />

            {/* Profile Avatar & Info */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 cursor-pointer outline-none"
              >
                <div className="h-9 w-9 rounded-full bg-[#0F1E3C] text-white flex items-center justify-center font-bold text-sm shadow-sm hover:bg-[#1A315C] transition-colors">
                  {userInitial}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-gray-900 leading-none">
                    {emailPrefix}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-0.5">
                    {role}
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-200/60 py-2 z-50 animate-fade-in text-left">
                  <div className="px-4 py-2 border-b border-neutral-100 sm:hidden">
                    <p className="text-xs font-semibold text-gray-900 truncate">{email}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">{role}</p>
                  </div>
                  <div className="px-2 py-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-neutral-50 hover:text-[#0F1E3C] transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <span>View Profile</span>
                    </Link>
                  </div>
                  <div className="h-px bg-neutral-100 my-1 mx-2" />
                  <div className="px-2 pb-1">
                    <SignOutButton />
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
