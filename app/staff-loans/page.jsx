import Link from "next/link";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { getStaffWithLoans } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import StaffLoansClient from "./StaffLoansClient";

export const metadata = {
  title: "Personel Avansları — Oto Servis CRM",
  description: "Personele verilen avansları ve toplam borç durumunu takip edin.",
};

export default async function StaffLoansPage() {
  const { staff, error } = await getStaffWithLoans();

  const grandTotal = staff.reduce((s, p) => s + p.totalLoaned, 0);

  return (
    <DashboardShell>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              <Link href="/dashboard" className="hover:text-blue-600">
                Panel
              </Link>
              {" / Personel Avansları"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Personel Avansları
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Personele verilen avansları kaydedin ve takip edin.
            </p>
          </div>

          {/* Grand total badge */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">
              Toplam Avans
            </p>
            <p className="mt-1 text-2xl font-extrabold text-rose-700">
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Veriler yüklenemedi: {error}
            </div>
          )}

          {!error && staff.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
              <span className="mb-4 text-5xl">👷</span>
              <p className="text-lg font-semibold text-slate-700">
                Henüz personel kaydı yok
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Önce veritabanına personel ekleyin.
              </p>
            </div>
          )}

          {/* Pass data to client component for interactivity */}
          {!error && staff.length > 0 && (
            <StaffLoansClient staff={staff} />
          )}
        </div>
      </main>
    </DashboardShell>
  );
}
