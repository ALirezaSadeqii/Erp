import Link from "next/link";
import { SERVICE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/config/constants";
import { formatCurrency, formatDate } from "@/lib/format";

export function ServiceListCard({ services }) {
  if (!services?.length) {
    return (
      <p className="text-sm text-slate-500">Bu ziyarette kayıtlı hizmet yok.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr>
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hizmet
            </th>
            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Personel
            </th>
            <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fiyat
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {services.map((service) => (
            <tr key={service.id}>
              <td className="py-3 text-sm font-medium text-slate-900">
                {SERVICE_TYPE_LABELS[service.service_type] ?? service.service_type}
                {service.notes && (
                  <p className="mt-0.5 text-xs text-slate-500">{service.notes}</p>
                )}
              </td>
              <td className="py-3 text-sm text-slate-600">
                {service.staff?.name ?? "—"}
                {service.staff?.role && (
                  <span className="text-slate-400"> · {service.staff.role}</span>
                )}
              </td>
              <td className="py-3 text-right text-sm font-medium text-slate-900">
                {formatCurrency(service.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VisitHistoryCard({ visits, carId }) {
  if (!visits?.length) {
    return (
      <p className="text-sm text-slate-500">Bu araca ait ziyaret kaydı yok.</p>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit) => (
        <div
          key={visit.id}
          className="rounded-lg border border-slate-100 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/visits/${visit.id}`}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {formatDate(visit.entry_date)}
                  {visit.exit_date && ` — ${formatDate(visit.exit_date)}`}
                </Link>
                <Link
                  href={`/visits/${visit.id}/edit`}
                  className="text-xs font-medium text-slate-500 hover:text-indigo-600"
                >
                  Düzenle
                </Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {PAYMENT_METHOD_LABELS[visit.payment_method] ?? visit.payment_method ?? "—"}
                {visit.requires_chassis_alignment && " · Şasi hizalama"}
              </p>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {formatCurrency(visit.total_amount)}
            </p>
          </div>

          {visit.services?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {visit.services.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                >
                  {SERVICE_TYPE_LABELS[s.service_type] ?? s.service_type}
                </span>
              ))}
            </div>
          )}

          {visit.notes && (
            <p className="mt-2 text-xs text-slate-500">{visit.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
