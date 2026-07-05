# Reports System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Reports Hub at `/reports` with three dedicated sub-report pages: Financial, Operations, and Staff — all with date preset buttons (Today / This Week / This Month / This Year).

**Architecture:** The existing `/reports` page becomes a hub showing 4 live daily stats cards and navigation tiles to sub-reports. Its current content moves to `/reports/financial`. Two new pages: `/reports/operations` (active/completed cars, shop throughput) and `/reports/staff` (service performance + monthly salary advance deductions). Three new query functions added to `lib/reportQueries.js`. A shared `lib/datePresets.js` utility computes preset date ranges server-side.

**Tech Stack:** Next.js 16 App Router, React Server Components, Supabase JS v2, Tailwind CSS 4.x, JavaScript only (no TypeScript)

---

## File Map

**Create:**
- `lib/datePresets.js` — computes Today / This Week / This Month / This Year date ranges
- `app/reports/financial/page.jsx` — current `/reports` content moved here + date presets added
- `app/reports/operations/page.jsx` — active cars, completed in period, avg days, chassis/parts stats
- `app/reports/staff/page.jsx` — staff performance + advances vs fixed salary

**Modify:**
- `lib/reportQueries.js` — add `getHubStats`, `getOperationsReport`, `getStaffReport`
- `app/reports/page.jsx` — replace with hub (quick stats + nav tiles)

**No changes needed:**
- `config/constants.js` — NAV_ITEMS already has `/reports`; sidebar `startsWith` covers sub-routes
- `supabase/schema.sql` — no DB changes required; all reports use existing tables

---

## Task 1: Add query functions to lib/reportQueries.js

**Files:**
- Modify: `lib/reportQueries.js`

- [ ] **Step 1: Append `getHubStats` to reportQueries.js**

Appends after the existing `getReport` export:

```javascript
export async function getHubStats() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const [incomeRes, activeCarsRes, completedTodayRes, advancesRes] = await Promise.all([
    supabase.from("visits").select("total_amount").eq("entry_date", today),
    supabase.from("visits").select("id", { count: "exact", head: true }).is("exit_date", null),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("exit_date", today),
    supabase.from("staff_loans").select("amount").gte("loan_date", monthStart).lte("loan_date", today),
  ]);

  return {
    todayIncome: (incomeRes.data ?? []).reduce((s, v) => s + (parseFloat(v.total_amount) || 0), 0),
    activeCarsCount: activeCarsRes.count ?? 0,
    completedToday: completedTodayRes.count ?? 0,
    staffAdvancesThisMonth: (advancesRes.data ?? []).reduce((s, l) => s + (l.amount ?? 0), 0),
  };
}
```

- [ ] **Step 2: Append `getOperationsReport` to reportQueries.js**

```javascript
export async function getOperationsReport({ dateFrom, dateTo } = {}) {
  const supabase = await createClient();

  const activeCarsQuery = supabase
    .from("visits")
    .select(`id, entry_date, cars(id, license_plate, model, vehicle_type, color, customers(name, phone))`)
    .is("exit_date", null)
    .order("entry_date", { ascending: true });

  let completedQuery = supabase
    .from("visits")
    .select(`id, entry_date, exit_date, total_amount, cars(id, license_plate, model, vehicle_type, customers(name))`)
    .not("exit_date", "is", null)
    .order("exit_date", { ascending: false });
  if (dateFrom) completedQuery = completedQuery.gte("exit_date", dateFrom);
  if (dateTo) completedQuery = completedQuery.lte("exit_date", dateTo);

  let statsQuery = supabase
    .from("visits")
    .select("id, entry_date, exit_date, requires_chassis_alignment, painted_parts_count, bodywork_parts_count");
  if (dateFrom) statsQuery = statsQuery.gte("entry_date", dateFrom);
  if (dateTo) statsQuery = statsQuery.lte("entry_date", dateTo);

  const [activeCarsRes, completedRes, statsRes] = await Promise.all([
    activeCarsQuery,
    completedQuery,
    statsQuery,
  ]);

  if (activeCarsRes.error) return { error: activeCarsRes.error.message };
  if (completedRes.error) return { error: completedRes.error.message };
  if (statsRes.error) return { error: statsRes.error.message };

  const active = activeCarsRes.data ?? [];
  const completed = completedRes.data ?? [];
  const periodRows = statsRes.data ?? [];
  const now = Date.now();

  const completedWithDays = completed.map((v) => {
    const days = Math.max(0, Math.floor((new Date(v.exit_date) - new Date(v.entry_date)) / 86400000));
    return {
      id: v.id,
      entryDate: v.entry_date,
      exitDate: v.exit_date,
      days,
      totalAmount: parseFloat(v.total_amount) || 0,
      licensePlate: v.cars?.license_plate ?? "—",
      model: [v.cars?.vehicle_type, v.cars?.model].filter(Boolean).join(" "),
      customerName: v.cars?.customers?.name ?? "—",
    };
  });

  const avgDaysInShop =
    completedWithDays.length > 0
      ? Math.round((completedWithDays.reduce((s, v) => s + v.days, 0) / completedWithDays.length) * 10) / 10
      : 0;

  return {
    error: null,
    activeCars: active.map((v) => ({
      id: v.id,
      entryDate: v.entry_date,
      daysInShop: Math.floor((now - new Date(v.entry_date)) / 86400000),
      licensePlate: v.cars?.license_plate ?? "—",
      model: [v.cars?.vehicle_type, v.cars?.model].filter(Boolean).join(" "),
      color: v.cars?.color ?? "",
      customerName: v.cars?.customers?.name ?? "—",
      phone: v.cars?.customers?.phone ?? "—",
    })),
    completedInPeriod: completedWithDays,
    summary: {
      activeCarsCount: active.length,
      completedCount: completed.length,
      avgDaysInShop,
      newEntriesCount: periodRows.length,
      chassisCount: periodRows.filter((v) => v.requires_chassis_alignment).length,
      paintedPartsTotal: periodRows.reduce((s, v) => s + (v.painted_parts_count || 0), 0),
      bodyworkPartsTotal: periodRows.reduce((s, v) => s + (v.bodywork_parts_count || 0), 0),
    },
  };
}
```

- [ ] **Step 3: Append `getStaffReport` to reportQueries.js**

```javascript
export async function getStaffReport({ dateFrom, dateTo } = {}) {
  const supabase = await createClient();

  let loansQuery = supabase
    .from("staff_loans")
    .select("id, staff_id, amount, loan_date")
    .order("loan_date", { ascending: false });
  if (dateFrom) loansQuery = loansQuery.gte("loan_date", dateFrom);
  if (dateTo) loansQuery = loansQuery.lte("loan_date", dateTo);

  let servicesQuery = supabase
    .from("services")
    .select("id, staff_id, price, service_type, visits!inner(entry_date)");
  if (dateFrom) servicesQuery = servicesQuery.gte("visits.entry_date", dateFrom);
  if (dateTo) servicesQuery = servicesQuery.lte("visits.entry_date", dateTo);

  const [staffRes, loansRes, servicesRes] = await Promise.all([
    supabase.from("staff").select("id, name, role, fixed_salary").order("name"),
    loansQuery,
    servicesQuery,
  ]);

  if (staffRes.error) return { error: staffRes.error.message };
  if (loansRes.error) return { error: loansRes.error.message };

  const loansByStaff = {};
  for (const l of loansRes.data ?? []) {
    if (!loansByStaff[l.staff_id]) loansByStaff[l.staff_id] = [];
    loansByStaff[l.staff_id].push(l);
  }

  const servicesByStaff = {};
  for (const s of servicesRes.data ?? []) {
    if (!s.staff_id) continue;
    if (!servicesByStaff[s.staff_id]) servicesByStaff[s.staff_id] = [];
    servicesByStaff[s.staff_id].push(s);
  }

  const staff = (staffRes.data ?? []).map((s) => {
    const loans = loansByStaff[s.id] ?? [];
    const services = servicesByStaff[s.id] ?? [];
    const advances = loans.reduce((sum, l) => sum + (l.amount ?? 0), 0);
    const serviceRevenue = services.reduce((sum, svc) => sum + (parseFloat(svc.price) || 0), 0);
    const fixedSalary = s.fixed_salary ?? 0;
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      fixedSalary,
      advances,
      netPayout: fixedSalary - advances,
      serviceCount: services.length,
      serviceRevenue,
      loans,
    };
  });

  return {
    error: null,
    staff,
    summary: {
      totalAdvances: staff.reduce((s, p) => s + p.advances, 0),
      totalNetPayout: staff.reduce((s, p) => s + p.netPayout, 0),
      totalServiceRevenue: staff.reduce((s, p) => s + p.serviceRevenue, 0),
    },
  };
}
```

- [ ] **Step 4: Verify no syntax errors**

```bash
node --input-type=module < /dev/null && echo ok
# Just check the file parses:
node -e "require('./lib/reportQueries.js')" 2>&1 || true
```

- [ ] **Step 5: Commit**

```bash
git add lib/reportQueries.js
git commit -m "feat: add getHubStats, getOperationsReport, getStaffReport queries"
```

---

## Task 2: Create lib/datePresets.js

**Files:**
- Create: `lib/datePresets.js`

- [ ] **Step 1: Create the file**

```javascript
// lib/datePresets.js
export function getDatePresets() {
  const now = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const today = fmt(now);

  const weekStart = new Date(now);
  const day = now.getDay();
  weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = fmt(new Date(now.getFullYear(), 0, 1));

  return [
    { label: "Bugün", dateFrom: today, dateTo: today },
    { label: "Bu Hafta", dateFrom: fmt(weekStart), dateTo: today },
    { label: "Bu Ay", dateFrom: monthStart, dateTo: today },
    { label: "Bu Yıl", dateFrom: yearStart, dateTo: today },
  ];
}

export function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export function getThisMonthRange() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  return { dateFrom: monthStart, dateTo: today };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/datePresets.js
git commit -m "feat: add datePresets utility for report preset date ranges"
```

---

## Task 3: Create app/reports/financial/page.jsx

**Files:**
- Create: `app/reports/financial/page.jsx`

Copy the full content of `app/reports/page.jsx` and make these changes:
1. Add `import { getDatePresets } from "@/lib/datePresets"` 
2. Add preset buttons above the date form
3. Breadcrumb: `Panel / Raporlar / Mali Raporlar`

- [ ] **Step 1: Create the file** (full content below)

The preset buttons render as `<a>` links with query params pre-computed from `getDatePresets()`. They sit above the existing date form.

```jsx
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
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
                  <SummaryCard label="Toplam Gelir" value={formatCurrency(summary.totalIncome)} sub={`${summary.visitCount} ziyaret (${summary.completedCount} tamamlandı)`} color="blue" />
                  <SummaryCard label="Toplam Araç Gideri" value={formatCurrency(summary.totalExpenses)} sub="Hizmete alınan araç masrafları" color="red" />
                  <SummaryCard label="Net Kâr" value={formatCurrency(summary.netProfit)} sub="Gelir − Araç Giderleri" color={summary.netProfit >= 0 ? "green" : "red"} />
                  <SummaryCard label="Toplam Ziyaret" value={summary.visitCount} sub={`${summary.activeCount} aktif · ${summary.completedCount} tamamlandı`} color="slate" />
                  <SummaryCard label="Ortalama Gelir / Ziyaret" value={formatCurrency(summary.visitCount > 0 ? summary.totalIncome / summary.visitCount : 0)} color="purple" />
                  <SummaryCard label="Ortalama Net Kâr / Ziyaret" value={formatCurrency(summary.visitCount > 0 ? summary.netProfit / summary.visitCount : 0)} color={summary.netProfit >= 0 ? "green" : "red"} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Section title="Ödeme Yöntemine Göre" icon="💳">
                    {byPaymentMethod.length === 0 ? <EmptyState message="Bu aralıkta veri yok." /> : byPaymentMethod.map((row) => (
                      <BarRow key={row.method} label={PAYMENT_METHOD_LABELS[row.method] ?? row.method} value={row.total} total={summary.totalIncome} count={row.count} />
                    ))}
                  </Section>
                  <Section title="Hizmet Türüne Göre" icon="🔧">
                    {byServiceType.length === 0 ? <EmptyState message="Bu aralıkta hizmet yok." /> : byServiceType.map((row) => (
                      <BarRow key={row.type} label={SERVICE_TYPE_LABELS[row.type] ?? row.type} value={row.total} total={byServiceType.reduce((s, r) => s + r.total, 0)} count={row.count} />
                    ))}
                  </Section>
                  <Section title="Personele Göre Hizmet Geliri" icon="👷">
                    {byStaff.length === 0 ? <EmptyState message="Bu aralıkta personel verisi yok." /> : byStaff.map((row) => (
                      <BarRow key={row.id} label={`${row.name}${row.role ? ` (${row.role})` : ""}`} value={row.total} total={byStaff.reduce((s, r) => s + r.total, 0)} count={row.count} />
                    ))}
                  </Section>
                  <Section title="Sigortaya Göre" icon="🛡️">
                    {byInsurance.length === 0 ? <EmptyState message="Bu aralıkta sigorta verisi yok." /> : byInsurance.map((row) => (
                      <BarRow key={row.insurance} label={row.insurance} value={row.total} total={summary.totalIncome} count={row.count} />
                    ))}
                  </Section>
                </div>

                <Section title="Araca Göre Detay" icon="🚗">
                  {byVehicle.length === 0 ? <EmptyState message="Bu aralıkta araç verisi yok." /> : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plaka</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Araç</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Müşteri</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Ziyaret</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gelir</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gider</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Net Kâr</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {byVehicle.map((v) => (
                            <tr key={v.id} className="transition-colors hover:bg-slate-50">
                              <td className="whitespace-nowrap py-3 pl-4 pr-6">
                                <Link href={`/cars/${v.id}`} className="font-semibold text-blue-600 hover:text-blue-800">{v.licensePlate}</Link>
                              </td>
                              <td className="max-w-[160px] truncate px-4 py-3 text-slate-600">{v.model || "—"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{v.customerName}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{v.visitCount}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(v.totalIncome)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500">{formatCurrency(v.totalExpenses)}</td>
                              <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${v.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{formatCurrency(v.netProfit)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td colSpan={4} className="py-3 pl-4 pr-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Toplam</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(summary.totalIncome)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-500">{formatCurrency(summary.totalExpenses)}</td>
                            <td className={`whitespace-nowrap px-4 py-3 text-right font-extrabold ${summary.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{formatCurrency(summary.netProfit)}</td>
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
```

- [ ] **Step 2: Commit**

```bash
git add app/reports/financial/page.jsx
git commit -m "feat: add /reports/financial page with date presets"
```

---

## Task 4: Update app/reports/page.jsx → Hub

**Files:**
- Modify: `app/reports/page.jsx`

- [ ] **Step 1: Replace the file content**

```jsx
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

          {/* Today's quick stats */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Bugün</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Bugünkü Gelir" value={formatCurrency(todayIncome)} color="blue" />
              <StatCard label="Aktif Araçlar" value={activeCarsCount} color="slate" />
              <StatCard label="Bugün Teslim Edildi" value={completedToday} color="green" />
              <StatCard label="Bu Ay Avans" value={formatCurrency(staffAdvancesThisMonth)} color="red" />
            </div>
          </section>

          {/* Report tiles */}
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
```

- [ ] **Step 2: Commit**

```bash
git add app/reports/page.jsx
git commit -m "feat: replace /reports with hub page showing daily stats and nav tiles"
```

---

## Task 5: Create app/reports/operations/page.jsx

**Files:**
- Create: `app/reports/operations/page.jsx`

- [ ] **Step 1: Create the file**

```jsx
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
                <label htmlFor="dateFrom" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Başlangıç</label>
                <input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dateTo" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bitiş</label>
                <input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Getir</button>
              {(dateFrom || dateTo) && (
                <a href="/reports/operations" className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">Temizle</a>
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
                  <SummaryCard label="Aktif Araçlar" value={summary.activeCarsCount} sub="Şu an serviste" color="blue" />
                  <SummaryCard label="Tamamlanan" value={summary.completedCount} sub={dateFrom || dateTo ? "Seçilen dönemde" : "Tüm zamanlar"} color="green" />
                  <SummaryCard label="Ort. Servis Süresi" value={`${summary.avgDaysInShop} gün`} sub="Tamamlanan araçlar" color="slate" />
                  <SummaryCard label="Eksoz Hizalama" value={summary.chassisCount} sub={`${summary.newEntriesCount} girişten`} color="amber" />
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
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Giriş Tarihi</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Serviste (gün)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeCars.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="whitespace-nowrap py-3 pl-4 pr-6">
                                <Link href={`/visits/${v.id}`} className="font-semibold text-blue-600 hover:text-blue-800">{v.licensePlate}</Link>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{v.model || "—"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{v.customerName}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(v.entryDate)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${v.daysInShop > 7 ? "bg-rose-100 text-rose-700" : v.daysInShop > 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
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
                    <EmptyState message="Seçilen dönemde tamamlanan araç yok." />
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
                                <Link href={`/visits/${v.id}`} className="font-semibold text-blue-600 hover:text-blue-800">{v.licensePlate}</Link>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{v.model || "—"}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{v.customerName}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(v.entryDate)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(v.exitDate)}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{v.days}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(v.totalAmount)}</td>
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
```

- [ ] **Step 2: Commit**

```bash
git add app/reports/operations/page.jsx
git commit -m "feat: add /reports/operations page"
```

---

## Task 6: Create app/reports/staff/page.jsx

**Files:**
- Create: `app/reports/staff/page.jsx`

- [ ] **Step 1: Create the file** (defaults to this month)

```jsx
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
            <Link href="/dashboard" className="hover:text-blue-600">Panel</Link>
            {" / "}
            <Link href="/reports" className="hover:text-blue-600">Raporlar</Link>
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
                <label htmlFor="dateFrom" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Başlangıç</label>
                <input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dateTo" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bitiş</label>
                <input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Getir</button>
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
                {/* Summary */}
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
                              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">{formatCurrency(s.fixedSalary)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-rose-600">{formatCurrency(s.advances)}</td>
                              <td className={`whitespace-nowrap px-4 py-3 text-right font-bold ${s.netPayout >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                {formatCurrency(s.netPayout)}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">{s.serviceCount}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-blue-700">{formatCurrency(s.serviceRevenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td className="py-3 pl-6 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Toplam</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCurrency(staff.reduce((s, p) => s + p.fixedSalary, 0))}</td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600">{formatCurrency(summary.totalAdvances)}</td>
                            <td className={`px-4 py-3 text-right font-extrabold ${summary.totalNetPayout >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{formatCurrency(summary.totalNetPayout)}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-600">{staff.reduce((s, p) => s + p.serviceCount, 0)}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(summary.totalServiceRevenue)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Loan details per staff */}
                {staff.filter((s) => s.loans.length > 0).map((s) => (
                  <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💸</span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">{s.name} — Avans Detayı</h3>
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
```

- [ ] **Step 2: Commit**

```bash
git add app/reports/staff/page.jsx
git commit -m "feat: add /reports/staff page with advances and performance"
```

---

## Self-Review Checklist

- [x] Hub stats: today income, active cars, completed today, this month advances — all covered by `getHubStats`
- [x] Financial: existing functionality preserved + presets added — matches spec
- [x] Operations: active cars (always shown), completed in period (date-filtered), avg days, chassis count, parts totals — all covered
- [x] Staff: per-staff salary vs advances, net payout, service count + revenue, loan details — all covered
- [x] Preset buttons: Today / This Week / This Month / This Year — all four pages
- [x] Staff report defaults to this month — `getThisMonthRange()` used as default
- [x] No TypeScript, no inline styles, Tailwind only, Turkish labels — checked
- [x] All breadcrumbs link back to hub — checked
- [x] No DB migrations required — confirmed, uses existing 6 tables
- [x] No `NAV_ITEMS` changes needed — sidebar `startsWith("/reports")` covers all sub-routes
