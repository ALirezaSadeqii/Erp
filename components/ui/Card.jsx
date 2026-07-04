import { formatCurrency } from "@/lib/format";

export function InfoCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {title && (
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, highlight = false, currency = false }) {
  const display =
    currency && typeof value === "number" ? formatCurrency(value) : value;

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        highlight ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${
          highlight ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {display}
      </p>
    </div>
  );
}
