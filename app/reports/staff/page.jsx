import Link from "next/link";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { formatCurrency, formatDate } from "@/lib/format";
import { getStaffReport } from "@/lib/reportQueries";
import { getDatePresets, getThisMonthRange } from "@/lib/datePresets";

export const metadata = {
  title: "Personel Raporları — Oto Servis CRM",
};

function SummaryCard({ label, value, color = "slate" }) {
  const colorMap = {
    slate: { bg: "bg-white border-slate-200", label: "text-slate-500", value: "text-slate-900" },
    blue: { bg: "bg-indigo-50 border-indigo-200", label: "text-indigo-600", value: "text-indigo-800" },
    green: { bg: "bg-emerald-50 border-emerald-200", label: "text-emerald-600", value: "text-emerald-800" },
    red: { bg: "bg-rose-50 border-rose-200", label: "text-rose-600", value: "text-rose-800" },
  };
  const c = colorMap[color] ?? colorMap.slate;
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${c.bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${c.label}`}>{label}</p>
      <p className={`mt-3 text-3xl font-extrabold ${c.value}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="py-4 text-center text-sm text-slate-400">{message}</p>;
}

export default async function StaffReportPage({ searchParams }) {
  const sp = await searchParams;
  const presets = getDatePresets();
  const defaultRange = getThisMonthRange();

  const dateFrom = sp?.dateFrom ?? defaultRange.dateFrom;
  const dateTo = sp?.dateTo ?? defaultRange.dateTo;

  const result = await getStaffReport({ dateFrom, dateTo });

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-indigo-600">Panel</Link>
            {" / "}
            <Link href="/reports" className="hover:text-indigo-600">Raporlar</Link>
            {" / Personel"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Personel Raporları</h1>
          <p className="mt-1 text-sm text-slate-500">Hizmet performansı ve maaş avans durumu.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">

          {/* Filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              {presets.map((p) => {
                const isActive = dateFrom === p.dateFrom && dateTo === p.dateTo;
                return (
                  <a
                    key={p.label}
                    href={`/reports/staff?dateFrom=${p.dateFrom}&dateTo=${p.dateTo}`}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-indigo-600 text-white shadow"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </a>
                );
              })}
            </div>
            <form method="GET" className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dateFrom" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Başlangıç
                </label>
                <input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  defaultValue={dateFrom}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dateTo" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Bitiş
                </label>
                <input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  defaultValue={dateTo}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Getir
              </button>
            </form>
          </div>

          {result.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Rapor alınamadı: {result.error}
            </div>
          )}

          {!result.error && (() => {
            const { staff, summary } = result;
            return (
              <>
                {/* Summary cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <SummaryCard label="Toplam Avans" value={formatCurrency(summary.totalAdvances)} color="red" />
                  <SummaryCard label="Toplam Net Maaş" value={formatCurrency(summary.totalNetPayout)} color="green" />
                  <SummaryCard label="Toplam Hizmet Geliri" value={formatCurrency(summary.totalServiceRevenue)} color="blue" />
                </div>

                {/* Staff table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
                    <span className="text-xl">👷</span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Personel Detayı</h2>
                  </div>
                  {staff.length === 0 ? (
                    <div className="p-6"><EmptyState message="Personel kaydı bulunamadı." /></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Personel</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Sabit Maaş</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Avans</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Maaş</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Hizmet</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Hizmet Geliri</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {staff.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="whitespace-nowrap py-3 pl-6 pr-4">
                                <p className="font-semibold text-slate-900">{s.name}</p>
                                {s.role && <p className="text-xs text-slate-400">{s.role}</p>}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                                {formatCurrency(s.fixedSalary)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-rose-600">
                                {formatCurrency(s.advances)}
                              </td>
                              <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${s.netPayout >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                {formatCurrency(s.netPayout)}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">{s.serviceCount}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-indigo-700">
                                {formatCurrency(s.serviceRevenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td className="py-3 pl-6 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Toplam</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                              {formatCurrency(staff.reduce((s, p) => s + p.fixedSalary, 0))}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600">
                              {formatCurrency(summary.totalAdvances)}
                            </td>
                            <td className={`px-4 py-3 text-right font-extrabold ${summary.totalNetPayout >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              {formatCurrency(summary.totalNetPayout)}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-600">
                              {staff.reduce((s, p) => s + p.serviceCount, 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-indigo-700">
                              {formatCurrency(summary.totalServiceRevenue)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Per-staff loan breakdown */}
                {staff.filter((s) => s.loans.length > 0).map((s) => (
                  <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💸</span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                          {s.name} — Avans Detayı
                        </h3>
                      </div>
                      <span className="text-sm font-bold text-rose-600">{formatCurrency(s.advances)}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {s.loans.map((l) => (
                        <div key={l.id} className="flex items-center justify-between px-6 py-3">
                          <span className="text-sm text-slate-500">{formatDate(l.loan_date)}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(l.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </main>
    </DashboardShell>
  );
}
