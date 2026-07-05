import Link from "next/link";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { formatCurrency, formatDate } from "@/lib/format";
import { getOperationsReport } from "@/lib/reportQueries";
import { getDatePresets } from "@/lib/datePresets";

export const metadata = {
  title: "Operasyon Raporları — Oto Servis CRM",
};

function SummaryCard({ label, value, sub, color = "slate" }) {
  const colorMap = {
    slate: { bg: "bg-white border-slate-200", label: "text-slate-500", value: "text-slate-900", sub: "text-slate-400" },
    blue: { bg: "bg-blue-50 border-blue-200", label: "text-blue-600", value: "text-blue-800", sub: "text-blue-400" },
    green: { bg: "bg-emerald-50 border-emerald-200", label: "text-emerald-600", value: "text-emerald-800", sub: "text-emerald-400" },
    amber: { bg: "bg-amber-50 border-amber-200", label: "text-amber-600", value: "text-amber-800", sub: "text-amber-400" },
  };
  const c = colorMap[color] ?? colorMap.slate;
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${c.bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${c.label}`}>{label}</p>
      <p className={`mt-3 text-3xl font-extrabold ${c.value}`}>{value}</p>
      {sub && <p className={`mt-1 text-xs ${c.sub}`}>{sub}</p>}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
        {icon && <span className="text-xl">{icon}</span>}
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="py-4 text-center text-sm text-slate-400">{message}</p>;
}

export default async function OperationsReportPage({ searchParams }) {
  const sp = await searchParams;
  const dateFrom = sp?.dateFrom ?? "";
  const dateTo = sp?.dateTo ?? "";
  const presets = getDatePresets();

  const result = await getOperationsReport({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-blue-600">Panel</Link>
            {" / "}
            <Link href="/reports" className="hover:text-blue-600">Raporlar</Link>
            {" / Operasyon"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Operasyon Raporları</h1>
          <p className="mt-1 text-sm text-slate-500">Aktif araçlar, teslimler ve servis süreleri.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">

          {/* Filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tamamlanan araçlar için dönem (aktif araçlar her zaman gösterilir)
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {presets.map((p) => {
                const isActive = dateFrom === p.dateFrom && dateTo === p.dateTo;
                return (
                  <a
                    key={p.label}
                    href={`/reports/operations?dateFrom=${p.dateFrom}&dateTo=${p.dateTo}`}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow"
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
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Getir
              </button>
              {(dateFrom || dateTo) && (
                <a
                  href="/reports/operations"
                  className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Temizle
                </a>
              )}
            </form>
          </div>

          {result.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Rapor alınamadı: {result.error}
            </div>
          )}

          {!result.error && (() => {
            const { summary, activeCars, completedInPeriod } = result;
            return (
              <>
                {/* Summary cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Aktif Araçlar"
                    value={summary.activeCarsCount}
                    sub="Şu an serviste"
                    color="blue"
                  />
                  <SummaryCard
                    label="Tamamlanan"
                    value={summary.completedCount}
                    sub={dateFrom || dateTo ? "Seçilen dönemde" : "Filtre seçilmedi"}
                    color="green"
                  />
                  <SummaryCard
                    label="Ort. Servis Süresi"
                    value={`${summary.avgDaysInShop} gün`}
                    sub="Tamamlanan araçlar"
                    color="slate"
                  />
                  <SummaryCard
                    label="Eksoz Hizalama"
                    value={summary.chassisCount}
                    sub={`${summary.newEntriesCount} girişten`}
                    color="amber"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SummaryCard label="Toplam Boyalı Parça" value={summary.paintedPartsTotal} color="slate" />
                  <SummaryCard label="Toplam Kaporta Parça" value={summary.bodyworkPartsTotal} color="slate" />
                </div>

                {/* Active cars */}
                <Section title={`Aktif Araçlar (${activeCars.length})`} icon="🚗">
                  {activeCars.length === 0 ? (
                    <EmptyState message="Şu an serviste araç yok." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plaka</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Araç</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Müşteri</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Telefon</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Giriş Tarihi</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Serviste</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeCars.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="whitespace-nowrap py-3 pl-4 pr-6">
                                <Link href={`/visits/${v.id}`} className="font-semibold text-blue-600 hover:text-blue-800">
                                  {v.licensePlate}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{v.model || "—"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{v.customerName}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{v.phone}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(v.entryDate)}</td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    v.daysInShop > 7
                                      ? "bg-rose-100 text-rose-700"
                                      : v.daysInShop > 3
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {v.daysInShop} gün
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>

                {/* Completed in period */}
                <Section title={`Tamamlanan Araçlar (${completedInPeriod.length})`} icon="✅">
                  {completedInPeriod.length === 0 ? (
                    <EmptyState message={dateFrom || dateTo ? "Seçilen dönemde tamamlanan araç yok." : "Dönem seçerek tamamlanan araçları görüntüleyin."} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plaka</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Araç</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Müşteri</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Giriş</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Teslim</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Gün</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {completedInPeriod.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="whitespace-nowrap py-3 pl-4 pr-6">
                                <Link href={`/visits/${v.id}`} className="font-semibold text-blue-600 hover:text-blue-800">
                                  {v.licensePlate}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{v.model || "—"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{v.customerName}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(v.entryDate)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(v.exitDate)}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{v.days}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                                {formatCurrency(v.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
              </>
            );
          })()}
        </div>
      </main>
    </DashboardShell>
  );
}
