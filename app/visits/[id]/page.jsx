import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { InfoCard, StatCard } from "@/components/ui/Card";
import { ServiceListCard } from "@/components/cards/ServiceListCard";
import { Button } from "@/components/ui/Button";
import { getVisitById } from "@/lib/queries";
import { PAYMENT_METHOD_LABELS } from "@/config/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { DeleteVisitButton } from "@/components/form/DeleteVisitButton";

export default async function VisitDetailPage({ params }) {
  const { id } = await params;
  const { visit, error } = await getVisitById(id);

  if (error || !visit) {
    notFound();
  }

  const car = visit.cars;
  const customer = car?.customers;

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              <Link href="/dashboard" className="hover:text-indigo-600">
                Panel
              </Link>
              {" / Ziyaret Detayı"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {formatDate(visit.entry_date)} — {car?.license_plate}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {customer?.name} · {customer?.phone}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/visits/${id}/edit`}>
              <Button variant="secondary">Düzenle</Button>
            </Link>
            <DeleteVisitButton visitId={id} />
            {car?.id && (
              <Link href={`/cars/${car.id}`}>
                <Button variant="secondary">Araç Geçmişi →</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Toplam Tutar" value={visit.total_amount} highlight currency />
            <StatCard
              label="Ödeme"
              value={PAYMENT_METHOD_LABELS[visit.payment_method] ?? visit.payment_method ?? "—"}
            />
            <StatCard label="Araç Gideri" value={visit.vehicle_expense ?? 0} currency />
            <StatCard label="Net Kar" value={(visit.total_amount ?? 0) - (visit.vehicle_expense ?? 0)} currency highlight />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Boyalı Parça" value={visit.painted_parts_count ?? 0} />
            <StatCard label="Kaporta Parça" value={visit.bodywork_parts_count ?? 0} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard title="Ziyaret Bilgileri">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Giriş Tarihi</dt>
                  <dd className="font-medium text-slate-900">{formatDate(visit.entry_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Çıkış Tarihi</dt>
                  <dd className="font-medium text-slate-900">
                    {visit.exit_date ? formatDate(visit.exit_date) : "Devam ediyor"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Şasi Hizalama</dt>
                  <dd className="font-medium text-slate-900">
                    {visit.requires_chassis_alignment ? "Evet" : "Hayır"}
                  </dd>
                </div>
                {visit.insurance && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Sigorta</dt>
                    <dd className="font-medium text-slate-900">{visit.insurance}</dd>
                  </div>
                )}
                {(visit.vehicle_expense > 0) && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Araç Gideri</dt>
                    <dd className="font-medium text-slate-900">{formatCurrency(visit.vehicle_expense)}</dd>
                  </div>
                )}
                {visit.notes && (
                  <div>
                    <dt className="text-slate-500">Notlar</dt>
                    <dd className="mt-1 font-medium text-slate-900">{visit.notes}</dd>
                  </div>
                )}
              </dl>
            </InfoCard>

            <InfoCard title="Araç & Müşteri">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Plaka</dt>
                  <dd className="font-medium text-slate-900">{car?.license_plate}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Model</dt>
                  <dd className="font-medium text-slate-900">
                    {[car?.vehicle_type, car?.model, car?.color].filter(Boolean).join(" · ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Müşteri</dt>
                  <dd className="font-medium text-slate-900">{customer?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Telefon</dt>
                  <dd className="font-medium text-slate-900">{customer?.phone}</dd>
                </div>
                {customer?.company_name && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Firma</dt>
                    <dd className="font-medium text-slate-900">{customer.company_name}</dd>
                  </div>
                )}
              </dl>
            </InfoCard>
          </div>

          <InfoCard title="Hizmetler">
            <ServiceListCard services={visit.services} />
            {visit.services?.length > 0 && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-right text-sm font-semibold text-slate-900">
                Hizmet Toplamı:{" "}
                {formatCurrency(
                  visit.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0)
                )}
              </p>
            )}
          </InfoCard>
        </div>
      </main>
    </DashboardShell>
  );
}
