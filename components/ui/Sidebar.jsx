"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/constants";
import { Button } from "@/components/ui/Button";
import { logout } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white">
      <div className="border-b border-slate-700 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Oto Servis
        </p>
        <h1 className="mt-1 text-lg font-bold">Yönetim Paneli</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <form action={logout}>
          <Button type="submit" variant="secondary" className="w-full">
            Çıkış Yap
          </Button>
        </form>
      </div>
    </aside>
  );
}
