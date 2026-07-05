import Link from "next/link";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { formatCurrency } from "@/lib/format";
import { getReport } from "@/lib/reportQueries";
import { getDatePresets } from "@/lib/datePresets";
import { PAYMENT_METHOD_LABELS, SERVICE_TYPE_LABELS } from "@/config/constants";

export const metadata = {
  title: "Mali Raporlar — Oto Servis CRM",
};

function SummaryCard({ label, value, sub, color = "slate" }) {
  const colorMap = {
    slate: { bg: "bg-white border-slate-200", label: "text-slate-500", value: "text-slate-900", sub: "text-slate-400" },
    blue: { bg: "bg-blue-50 border-blue-200", label: "text-blue-600", value: "text-blue-800", sub: "text-blue-400" },
    green: { bg: "bg-emerald-50 border-emerald-200", label: "text-emerald-600", value: "text-emerald-800", sub: "text-emerald-400" },
    red: { bg: "bg-rose-50 border-rose-200", label: "text-rose-600", value: "text-rose-800", sub: "text-rose-400" },
    purple: { bg: "bg-violet-50 border-violet-200", label: "text-violet-600", value: "text-violet-800", sub: "text-violet-400" },
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

function Section({ title, children, icon }) {
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

function BarRow({ label, value, total, count, currency = true }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="flex items-center gap-3 text-slate-500">
          {count !== undefined && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {count} ziyaret
            </span>
          )}
          <span className="font-bold text-slate-900">
            {currency ? formatCurrency(value) : value}
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="py-4 text-center text-sm text-slate-400">{message}</p>;
}

export default async function FinancialReportPage({ searchParams }) {
  const sp = await searchParams;
  const dateFrom = sp?.dateFrom ?? "";
  const dateTo = sp?.dateTo ?? "";
  const presets = getDatePresets();

  const result =
    dateFrom || dateTo
      ? await getReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      : null;

  const hasData = result && !result.error;

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-blue-600">Panel</Link>
            {" / "}
            <Link href="/reports" className="hover:text-blue-600">Raporlar</Link>
            {" / Mali Raporlar"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Mali Raporlar</h1>
          <p className="mt-1 text-sm text-slate-500">Gelir, gider ve hizmet raporlarını tarih aralığına göre inceleyin.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">

          {/* Presets + date range */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              {presets.map((p) => {
                const isActive = dateFrom === p.dateFrom && dateTo === p.dateTo;
                return (
                  <a
                    key={p.label}
                    href={`/reports/financial?dateFrom=${p.dateFrom}&dateTo=${p.dateTo}`}
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
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Getir
              </button>
              {(dateFrom || dateTo) && (
                <a
                  href="/reports/financial"
                  className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  Temizle
                </a>
              )}
            </form>
          </div>

          {!result && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
              <span className="mb-4 text-5xl">📊</span>
              <p className="text-lg font-semibold text-slate-700">Tarih aralığı seçin veya hazır filtre kullanın</p>
              <p className="mt-1 text-sm text-slate-400">Yukarıdaki butonlardan birini tıklayın.</p>
            </div>
          )}

          {result?.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Rapor alınamadı: {result.error}
            </div>
          )}

          {hasData && (() => {
            const { summary, byPaymentMethod, byServiceType, byStaff, byVehicle, byInsurance } = result;
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    label="Toplam Gelir"
                    value={formatCurrency(summary.totalIncome)}
                    sub={`${summary.visitCount} ziyaret (${summary.completedCount} tamamlandı)`}
                    color="blue"
                  />
                  <SummaryCard
                    label="Toplam Araç Gideri"
                    value={formatCurrency(summary.totalExpenses)}
                    sub="Hizmete alınan araç masrafları"
                    color="red"
                  />
                  <SummaryCard
                    label="Net Kâr"
                    value={formatCurrency(summary.netProfit)}
                    sub="Gelir − Araç Giderleri"
                    color={summary.netProfit >= 0 ? "green" : "red"}
                  />
                  <SummaryCard
                    label="Toplam Ziyaret"
                    value={summary.visitCount}
                    sub={`${summary.activeCount} aktif · ${summary.completedCount} tamamlandı`}
                    color="slate"
                  />
                  <SummaryCard
                    label="Ortalama Gelir / Ziyaret"
                    value={formatCurrency(summary.visitCount > 0 ? summary.totalIncome / summary.visitCount : 0)}
                    color="purple"
                  />
                  <SummaryCard
                    label="Ortalama Net Kâr / Ziyaret"
                    value={formatCurrency(summary.visitCount > 0 ? summary.netProfit / summary.visitCount : 0)}
                    color={summary.netProfit >= 0 ? "green" : "red"}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Section title="Ödeme Yöntemine Göre" icon="💳">
                    {byPaymentMethod.length === 0 ? (
                      <EmptyState message="Bu aralıkta veri yok." />
                    ) : (
                      byPaymentMethod.map((row) => (
                        <BarRow
                          key={row.method}
                          label={PAYMENT_METHOD_LABELS[row.method] ?? row.method}
                          value={row.total}
                          total={summary.totalIncome}
                          count={row.count}
                        />
                      ))
                    )}
                  </Section>

                  <Section title="Hizmet Türüne Göre" icon="🔧">
                    {byServiceType.length === 0 ? (
                      <EmptyState message="Bu aralıkta hizmet yok." />
                    ) : (
                      byServiceType.map((row) => (
                        <BarRow
                          key={row.type}
                          label={SERVICE_TYPE_LABELS[row.type] ?? row.type}
                          value={row.total}
                          total={byServiceType.reduce((s, r) => s + r.total, 0)}
                          count={row.count}
                        />
                      ))
                    )}
                  </Section>

                  <Section title="Personele Göre Hizmet Geliri" icon="👷">
                    {byStaff.length === 0 ? (
                      <EmptyState message="Bu aralıkta personel verisi yok." />
                    ) : (
                      byStaff.map((row) => (
                        <BarRow
                          key={row.id}
                          label={`${row.name}${row.role ? ` (${row.role})` : ""}`}
                          value={row.total}
                          total={byStaff.reduce((s, r) => s + r.total, 0)}
                          count={row.count}
                        />
                      ))
                    )}
                  </Section>

                  <Section title="Sigortaya Göre" icon="🛡️">
                    {byInsurance.length === 0 ? (
                      <EmptyState message="Bu aralıkta sigorta verisi yok." />
                    ) : (
                      byInsurance.map((row) => (
                        <BarRow
                          key={row.insurance}
                          label={row.insurance}
                          value={row.total}
                          total={summary.totalIncome}
                          count={row.count}
                        />
                      ))
                    )}
                  </Section>
                </div>

                <Section title="Araca Göre Detay" icon="🚗">
                  {byVehicle.length === 0 ? (
                    <EmptyState message="Bu aralıkta araç verisi yok." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plaka</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Araç</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Müşteri</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Ziyaret</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Toplam Gelir</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Araç Gideri</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Kâr</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {byVehicle.map((v) => (
                            <tr key={v.id} className="transition-colors hover:bg-slate-50">
                              <td className="whitespace-nowrap py-3 pl-4 pr-6">
                                <Link href={`/cars/${v.id}`} className="font-semibold text-blue-600 hover:text-blue-800">
                                  {v.licensePlate}
                                </Link>
                              </td>
                              <td className="max-w-[160px] truncate px-4 py-3 text-slate-600">{v.model || "—"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{v.customerName}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{v.visitCount}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(v.totalIncome)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500">{formatCurrency(v.totalExpenses)}</td>
                              <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${v.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                {formatCurrency(v.netProfit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td colSpan={4} className="py-3 pl-4 pr-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Toplam</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(summary.totalIncome)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-500">{formatCurrency(summary.totalExpenses)}</td>
                            <td className={`whitespace-nowrap px-4 py-3 text-right font-extrabold ${summary.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              {formatCurrency(summary.netProfit)}
                            </td>
                          </tr>
                        </tfoot>
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
