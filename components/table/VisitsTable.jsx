"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  SERVICE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/config/constants";
import { ColumnToggle, useColumnVisibility } from "./ColumnToggle";

/* ── Small sub-components ── */

function ServiceBadges({ serviceTypes }) {
  if (!serviceTypes?.length) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {serviceTypes.map((type) => (
        <span
          key={type}
          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
        >
          {SERVICE_TYPE_LABELS[type] ?? type}
        </span>
      ))}
    </div>
  );
}

function StaffBadges({ names }) {
  if (!names?.length) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function ServiceDetailsList({ details }) {
  if (!details?.length) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {details.map((d, i) => (
        <span key={i} className="text-xs text-slate-600">
          {SERVICE_TYPE_LABELS[d.type] ?? d.type}
          {d.staffName ? ` — ${d.staffName}` : ""}
          {d.price ? ` (${formatCurrency(d.price)})` : ""}
        </span>
      ))}
    </div>
  );
}

/* ── Column Definitions ── */
/* Each column has:
   - key: unique identifier
   - label: header text
   - group: for the toggle dropdown grouping
   - defaultVisible: whether shown by default
   - align: text alignment ("left" | "right")
   - render: function to render cell content from a visit row
   - className: optional extra classes for <td>
*/

const COLUMN_DEFS = [
  {
    key: "licensePlate",
    label: "Plaka",
    group: "Araç",
    defaultVisible: true,
    render: (v) => (
      <Link
        href={`/cars/${v.carId}`}
        className="font-semibold text-blue-600 hover:text-blue-800"
      >
        {v.licensePlate}
      </Link>
    ),
    className: "whitespace-nowrap",
  },
  {
    key: "customerName",
    label: "Müşteri",
    group: "Müşteri",
    defaultVisible: true,
    render: (v) => v.customerName,
    className: "whitespace-nowrap text-slate-700",
  },
  {
    key: "phone",
    label: "Telefon",
    group: "Müşteri",
    defaultVisible: true,
    render: (v) => v.phone,
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "companyName",
    label: "Firma",
    group: "Müşteri",
    defaultVisible: true,
    render: (v) => v.companyName || "—",
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "vehicle",
    label: "Araç",
    group: "Araç",
    defaultVisible: true,
    render: (v) => {
      const vehicle = [v.vehicleType, v.model, v.color]
        .filter(Boolean)
        .join(" · ");
      return vehicle || "—";
    },
    className: "max-w-[140px] truncate text-slate-600",
  },
  {
    key: "vehicleType",
    label: "Araç Tipi",
    group: "Araç",
    defaultVisible: false,
    render: (v) => v.vehicleType || "—",
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "model",
    label: "Model",
    group: "Araç",
    defaultVisible: false,
    render: (v) => v.model || "—",
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "color",
    label: "Renk",
    group: "Araç",
    defaultVisible: false,
    render: (v) => v.color || "—",
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "vin",
    label: "Şasi No",
    group: "Araç",
    defaultVisible: false,
    render: (v) => v.vin || "—",
    className: "whitespace-nowrap text-slate-600 font-mono text-xs",
  },
  {
    key: "entryDate",
    label: "Giriş",
    group: "Ziyaret",
    defaultVisible: true,
    render: (v) => (
      <Link
        href={`/visits/${v.id}`}
        className="text-slate-600 hover:text-blue-600"
      >
        {formatDate(v.entryDate)}
      </Link>
    ),
    className: "whitespace-nowrap",
  },
  {
    key: "exitDate",
    label: "Çıkış",
    group: "Ziyaret",
    defaultVisible: true,
    render: (v) =>
      v.exitDate ? (
        formatDate(v.exitDate)
      ) : (
        <span className="text-amber-600">Devam ediyor</span>
      ),
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "serviceTypes",
    label: "Hizmetler",
    group: "Hizmet",
    defaultVisible: true,
    render: (v) => <ServiceBadges serviceTypes={v.serviceTypes} />,
  },
  {
    key: "staffNames",
    label: "Personel",
    group: "Hizmet",
    defaultVisible: false,
    render: (v) => <StaffBadges names={v.staffNames} />,
  },
  {
    key: "staffRoles",
    label: "Personel Rolü",
    group: "Hizmet",
    defaultVisible: false,
    render: (v) => {
      if (!v.staffRoles?.length) return <span className="text-slate-400">—</span>;
      return v.staffRoles.join(", ");
    },
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "serviceDetails",
    label: "Hizmet Detayları",
    group: "Hizmet",
    defaultVisible: false,
    render: (v) => <ServiceDetailsList details={v.serviceDetails} />,
  },
  {
    key: "paintedPartsCount",
    label: "Boya",
    group: "Hizmet",
    defaultVisible: true,
    render: (v) => v.paintedPartsCount ?? 0,
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "bodyworkPartsCount",
    label: "Kaporta",
    group: "Hizmet",
    defaultVisible: true,
    render: (v) => v.bodyworkPartsCount ?? 0,
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "requiresChassisAlignment",
    label: "Şasi",
    group: "Hizmet",
    defaultVisible: true,
    render: (v) => (v.requiresChassisAlignment ? "Evet" : "Hayır"),
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "paymentMethod",
    label: "Ödeme",
    group: "Finansal",
    defaultVisible: true,
    render: (v) =>
      PAYMENT_METHOD_LABELS[v.paymentMethod] ?? v.paymentMethod ?? "—",
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "totalAmount",
    label: "Tutar",
    group: "Finansal",
    defaultVisible: true,
    align: "right",
    render: (v) => formatCurrency(v.totalAmount),
    className: "whitespace-nowrap font-medium text-slate-900",
  },
  {
    key: "vehicleExpense",
    label: "Araç Gideri",
    group: "Finansal",
    defaultVisible: false,
    align: "right",
    render: (v) => formatCurrency(v.vehicleExpense ?? 0),
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "insurance",
    label: "Sigorta",
    group: "Finansal",
    defaultVisible: false,
    render: (v) => v.insurance || "—",
    className: "whitespace-nowrap text-slate-600",
  },
  {
    key: "notes",
    label: "Not",
    group: "Ziyaret",
    defaultVisible: true,
    render: (v) => v.notes || "—",
    className: "max-w-[120px] truncate text-slate-500",
  },
];

/* ── Main Component ── */

export function VisitsTable({ visits }) {
  const { visibleKeys, setVisibleKeys, loaded } =
    useColumnVisibility(COLUMN_DEFS);

  const activeColumns = COLUMN_DEFS.filter((c) => visibleKeys.includes(c.key));

  if (!visits.length) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <ColumnToggle
            columns={COLUMN_DEFS}
            visibleKeys={visibleKeys}
            onChange={setVisibleKeys}
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">Kayıt bulunamadı</p>
          <p className="mt-1 text-sm text-slate-500">
            Arama kriterlerinizi değiştirmeyi deneyin.
          </p>
        </div>
      </div>
    );
  }

  /* Avoid layout shift while reading from localStorage */
  if (!loaded) {
    return (
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
    );
  }

  return (
    <div className="space-y-3">
      {/* Column toggle bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{visits.length}</span> kayıt
          bulundu
        </p>
        <ColumnToggle
          columns={COLUMN_DEFS}
          visibleKeys={visibleKeys}
          onChange={setVisibleKeys}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {activeColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-left">
                  {/* actions */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((visit) => (
                <tr
                  key={visit.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  {activeColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${
                        col.align === "right" ? "text-right" : ""
                      } ${col.className ?? ""}`}
                    >
                      {col.render(visit)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Link
                      href={`/visits/${visit.id}/edit`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
