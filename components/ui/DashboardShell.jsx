"use client";

import { Sidebar } from "./Sidebar";
import { useSidebar } from "./SidebarContext";

export function DashboardShell({ children }) {
  const { desktopOpen, mobileOpen, toggleDesktop, closeMobile, toggleMobile } =
    useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        isOpen={desktopOpen}
        mobileOpen={mobileOpen}
        onDesktopToggle={toggleDesktop}
        onMobileClose={closeMobile}
        onMobileToggle={toggleMobile}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with toggle */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
          <button
            onClick={() => {
              if (window.innerWidth >= 1024) {
                toggleDesktop();
              } else {
                toggleMobile();
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-amber-50 hover:text-amber-600"
            aria-label="Kenar çubuğunu aç/kapat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Altik Auto Service</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
              Premium
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
