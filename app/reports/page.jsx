import Link from "next/link";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { formatCurrency } from "@/lib/format";
import { getHubStats } from "@/lib/reportQueries";

export const metadata = {
  title: "Raporlar — Oto Servis CRM",
};

function StatCard({ label, value, color = "slate" }) {
  const colorMap = {
    slate: { bg: "bg-white border-slate-200", label: "text-slate-500", value: "text-slate-900" },
    blue: { bg: "bg-blue-50 border-blue-200", label: "text-blue-600", value: "text-blue-800" },
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

function ReportTile({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <span className="text-4xl">{icon}</span>
      <div>
        <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-700">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <span className="mt-auto text-sm font-semibold text-blue-600 group-hover:underline">
        Rapora Git →
      </span>
    </Link>
  );
}

export default async function ReportsHubPage() {
  const { todayIncome, activeCarsCount, completedToday, staffAdvancesThisMonth } = await getHubStats();

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-blue-600">Panel</Link>
            {" / Raporlar"}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Raporlar</h1>
          <p className="mt-1 text-sm text-slate-500">Bugünkü özet ve tüm raporlara erişim.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">

          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Bugün</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Bugünkü Gelir" value={formatCurrency(todayIncome)} color="blue" />
              <StatCard label="Aktif Araçlar" value={activeCarsCount} color="slate" />
              <StatCard label="Bugün Teslim Edildi" value={completedToday} color="green" />
              <StatCard label="Bu Ay Avans" value={formatCurrency(staffAdvancesThisMonth)} color="red" />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Raporlar</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <ReportTile
                href="/reports/financial"
                icon="💰"
                title="Mali Raporlar"
                description="Gelir, gider, net kâr, ödeme yöntemi, sigorta ve araç bazında finansal analiz."
              />
              <ReportTile
                href="/reports/operations"
                icon="🔧"
                title="Operasyon Raporları"
                description="Servisteki aktif araçlar, teslim edilenler, ortalama servis süresi ve parça sayıları."
              />
              <ReportTile
                href="/reports/staff"
                icon="👷"
                title="Personel Raporları"
                description="Hizmet performansı, maaş avansları ve dönemsel net maaş hesabı."
              />
            </div>
          </section>

        </div>
      </main>
    </DashboardShell>
  );
}
