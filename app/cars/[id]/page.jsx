import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { InfoCard, StatCard } from "@/components/ui/Card";
import { VisitHistoryCard } from "@/components/cards/ServiceListCard";
import { getCarWithHistory } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function CarDetailPage({ params }) {
  const { id } = await params;
  const { car, visits, error } = await getCarWithHistory(id);

  if (error || !car) {
    notFound();
  }

  const customer = car.customers;
  const totalSpent = visits.reduce(
    (sum, v) => sum + (parseFloat(v.total_amount) || 0),
    0
  );
  const totalVisits = visits.length;
  const lastVisit = visits[0];

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/dashboard" className="hover:text-indigo-600">
              Panel
            </Link>
            {" / Araç Detayı"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {car.license_plate}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {customer?.name} · {customer?.phone}
            {customer?.company_name && ` · ${customer.company_name}`}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Toplam Ziyaret" value={totalVisits} />
            <StatCard label="Toplam Harcama" value={totalSpent} highlight currency />
            <StatCard
              label="Son Ziyaret"
              value={lastVisit ? formatDate(lastVisit.entry_date) : "—"}
            />
            <StatCard
              label="Araç"
              value={[car.vehicle_type, car.model].filter(Boolean).join(" ") || "—"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard title="Araç Bilgileri">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Plaka</dt>
                  <dd className="font-medium text-slate-900">{car.license_plate}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tip</dt>
                  <dd className="font-medium text-slate-900">{car.vehicle_type ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Model</dt>
                  <dd className="font-medium text-slate-900">{car.model ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Renk</dt>
                  <dd className="font-medium text-slate-900">{car.color ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">VIN</dt>
                  <dd className="font-medium text-slate-900">{car.vin ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Kayıt Tarihi</dt>
                  <dd className="font-medium text-slate-900">{formatDate(car.created_at)}</dd>
                </div>
              </dl>
            </InfoCard>

            <InfoCard title="Müşteri Bilgileri">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ad</dt>
                  <dd className="font-medium text-slate-900">{customer?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Telefon</dt>
                  <dd className="font-medium text-slate-900">{customer?.phone ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Firma</dt>
                  <dd className="font-medium text-slate-900">
                    {customer?.company_name ?? "—"}
                  </dd>
                </div>
              </dl>
            </InfoCard>
          </div>

          <InfoCard title="Tam Ziyaret Geçmişi">
            <VisitHistoryCard visits={visits} carId={car.id} />
            {totalVisits > 0 && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-right text-sm font-semibold text-slate-900">
                Tüm Ziyaretler Toplamı: {formatCurrency(totalSpent)}
              </p>
            )}
          </InfoCard>
        </div>
      </main>
    </DashboardShell>
  );
}
