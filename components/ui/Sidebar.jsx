"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/constants";
import { logout } from "@/lib/auth";

const NAV_ICONS = {
  "/dashboard": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  "/visits/new": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  "/staff-loans": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "/reports": (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
};

export function Sidebar({ isOpen, onToggle }) {
  const pathname = usePathname();

  return (
    <>

      {/* Sidebar */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen flex-col bg-slate-900 transition-all duration-300 ease-in-out lg:flex ${
          isOpen ? "w-64" : "w-16"
        } overflow-hidden`}
      >
        {/* Logo Section */}
        <div className={`relative flex shrink-0 flex-col items-center border-b border-slate-700/60 bg-slate-950/50 ${isOpen ? "px-4 py-4" : "px-2 py-3"}`}>
          {isOpen ? (
            <>
              <div className="relative h-16 w-full overflow-hidden rounded-xl">
                <Image
                  src="/altik-logo.jpg"
                  alt="Altik Auto Service"
                  fill
                  className="object-contain object-center"
                  priority
                />
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
                  Premium Auto Care
                </p>
              </div>
            </>
          ) : (
            <div className="relative h-10 w-10 overflow-hidden rounded-lg">
              <Image
                src="/altik-logo.jpg"
                alt="Altik"
                fill
                className="object-contain object-center"
                priority
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isOpen ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 shadow-sm ring-1 ring-amber-500/20"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span className={`flex shrink-0 items-center justify-center ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"}`}>
                  {NAV_ICONS[item.href]}
                </span>
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout — always visible, pinned to bottom */}
        <div className={`shrink-0 border-t border-slate-700/60 bg-slate-950/30 p-2`}>
          <form action={logout}>
            <button
              type="submit"
              title={!isOpen ? "Çıkış Yap" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 ${
                !isOpen ? "justify-center" : ""
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {isOpen && <span>Çıkış Yap</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
