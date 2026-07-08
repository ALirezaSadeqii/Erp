# AI Developer Onboarding — Auto Repair Shop CRM

**For any AI assistant (Gemini, Claude, GPT, or other).**
Read this entire file before writing a single line of code.
Then read the files listed in the Mandatory Reading section.
Do not skip steps. Do not assume. Read first, then work.

---

## Mandatory Reading — 10 Files in Order

Read these files exactly in this order. Each one blocks knowledge that the next one requires.

| # | File | Why it matters |
|---|---|---|
| 1 | `GEMINI.md` | You are here. Top-level rules and architecture. Read everything. |
| 2 | `lib/queries.js` | Every SELECT query lives here. Learn `dedupeById`, `ilike`, `formatVisitRow`, and the full join shape. If you skip this, you'll write duplicate queries in page files — which is wrong. |
| 3 | `lib/actions.js` | Every INSERT/UPDATE/DELETE lives here. Learn the upsert-by-phone, upsert-by-plate, and delete-and-reinsert patterns. If you skip this, your writes won't match the established contract. |
| 4 | `lib/reportQueries.js` | All aggregation queries. Learn `getReport`, `getHubStats`, `getOperationsReport`, `getStaffReport`. Reports aggregate in JS, not SQL — learn why. |
| 5 | `lib/datePresets.js` | `getDatePresets()` and `getThisMonthRange()`. Every report page uses these. Never compute dates inline. |
| 6 | `config/constants.js` | All enum values: `SERVICE_TYPES`, `PAYMENT_METHODS`, `NAV_ITEMS`. If you hardcode "painting" or "cash" without importing from here, you'll create a drift. |
| 7 | `app/reports/page.jsx` | The hub pattern: no date filter, live stats via `getHubStats()`, navigation tiles. Understand `StatCard` and `ReportTile`. |
| 8 | `app/reports/financial/page.jsx` | The full report page pattern: preset `<a>` links, manual date `<form method="GET">`, conditional render only when `dateFrom || dateTo`. |
| 9 | `app/reports/staff/page.jsx` | Shows the "default to this month" pattern using `getThisMonthRange()`. Staff page always renders; financial page shows empty state until a date is chosen. |
| 10 | `components/ui/Sidebar.jsx` | Nav is driven entirely by `NAV_ITEMS` from `config/constants.js`. Adding a new top-level route requires adding it there — not hard-coding it in JSX. |

---

## What This App Is

An internal CRM for an **auto repair and bodywork shop**. Staff use it to:
- Record customers and their vehicles
- Track workshop visits (entry/exit, services performed, costs)
- Record staff salary advances (loans)
- View financial, operational, and staff reports

There is no public-facing content. All routes require login.
**The UI language is Turkish. All labels, messages, and button text must be in Turkish.**

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js App Router | Server Components by default |
| UI | React | `"use client"` only when needed |
| Styling | Tailwind CSS 4.x | No inline styles. No CSS files. Tailwind only. |
| Database | Supabase (PostgreSQL) | REST via supabase-js |
| Auth | Supabase Auth — email only | All routes protected by middleware |
| DB client | `@supabase/ssr` + `@supabase/supabase-js` | Server-side only |
| Language | **JavaScript only** | NO TypeScript. No `.ts` or `.tsx` files. |
| Path alias | `@/` = project root | Always use `@/`, never relative `../../` |

---

## Complete File Map

```
app/
├── layout.jsx                Root layout — wraps everything
├── page.jsx                  Redirects to /dashboard
├── globals.css               Tailwind imports only
├── login/                    Login page (public)
├── dashboard/                Visit list with full filter system
├── visits/
│   ├── new/                  Create visit form
│   └── [id]/
│       └── edit/             Edit visit form
├── cars/
│   └── [id]/                 Car detail + full visit history
├── staff-loans/              Record staff salary advances (write only — not reports)
└── reports/
    ├── page.jsx              Hub — today's live stats + nav tiles (no date filter)
    ├── financial/page.jsx    Income, expenses, profit by payment/service/staff/insurance/vehicle
    ├── operations/page.jsx   Active cars always shown; completed filtered by date
    └── staff/page.jsx        Staff performance + advances vs salary (defaults to this month)

lib/
├── supabase.js               Creates server Supabase client (uses cookies for auth)
├── supabase/middleware.js    Refreshes auth session on every request
├── queries.js                ALL read operations — every SELECT query lives here
├── actions.js                ALL write operations — "use server" file
├── reportQueries.js          Aggregation queries for all report pages
├── datePresets.js            Date range presets: Today, This Week, This Month, This Year
├── auth.js                   Login / logout helpers
└── format.js                 formatCurrency(), formatDate()

components/
├── ui/
│   ├── DashboardShell.jsx    Page wrapper — sidebar + main content area
│   ├── Sidebar.jsx           Nav driven by NAV_ITEMS from config/constants.js
│   ├── Button.jsx            Shared button component
│   ├── Card.jsx              Shared card component
│   └── FormFields.jsx        Shared form field components
├── form/
│   ├── VisitForm.jsx         Create/edit visit form (client component)
│   ├── VisitFilters.jsx      Dashboard filter bar
│   └── DeleteVisitButton.jsx Delete button with confirmation
├── table/
│   ├── VisitsTable.jsx       Visit list table
│   └── ColumnToggle.jsx      Column visibility toggle
└── cards/
    └── ServiceListCard.jsx   Service line items display

config/
└── constants.js              SERVICE_TYPES, SERVICE_TYPE_LABELS, PAYMENT_METHODS,
                              PAYMENT_METHOD_LABELS, NAV_ITEMS

supabase/
├── schema.sql                Human-readable schema reference — keep in sync with migrations
├── config.toml               Supabase project config
└── migrations/               The real source of truth for DB changes

middleware.js                 Protects all routes — redirects unauthenticated → /login
Makefile                      make migration / make deploy / make status / make link
.env.local                    Local secrets (gitignored — never commit)
```

---

## Database Schema — All 6 Tables

All tables have RLS enabled. All require authentication. No anonymous access.

### `customers`
```sql
id            UUID PK DEFAULT uuid_generate_v4()
name          TEXT NOT NULL
phone         TEXT NOT NULL          ← UNIQUE LOOKUP KEY. Always look up by phone, never by name.
company_name  TEXT                   ← nullable; corporate clients only
created_at    TIMESTAMP DEFAULT now()
```
**Business logic:** `phone` is the unique identifier. The upsert pattern always does `.eq("phone", ...)` first. There is no UNIQUE constraint on phone in the DB (the app enforces it via upsert logic).

---

### `cars`
```sql
id             UUID PK DEFAULT uuid_generate_v4()
customer_id    UUID → customers.id CASCADE DELETE
license_plate  TEXT UNIQUE NOT NULL   ← UNIQUE LOOKUP KEY. Always look up by plate.
vehicle_type   TEXT                   ← e.g. "Binek", "Ticari"
model          TEXT                   ← e.g. "Toyota Corolla"
color          TEXT
vin            TEXT
created_at     TIMESTAMP DEFAULT now()
```
**Business logic:** `license_plate` is the unique identifier. There is a UNIQUE constraint in the DB. The upsert pattern does `.eq("license_plate", ...)`. A car always belongs to one customer; updating a car can change its `customer_id` (ownership transfer is allowed).

---

### `visits`
```sql
id                         UUID PK DEFAULT uuid_generate_v4()
car_id                     UUID → cars.id CASCADE DELETE
entry_date                 DATE NOT NULL
exit_date                  DATE              ← NULL means car is STILL IN THE SHOP
requires_chassis_alignment BOOLEAN DEFAULT false
painted_parts_count        INTEGER DEFAULT 0
bodywork_parts_count       INTEGER DEFAULT 0
total_amount               NUMERIC           ← total charged to customer
payment_method             TEXT              ← see PAYMENT_METHODS in constants.js
insurance                  TEXT              ← free-text insurance company name
vehicle_expense            NUMERIC DEFAULT 0 ← cost of parts/materials (expense side)
notes                      TEXT
created_at                 TIMESTAMP DEFAULT now()
```
**Business logic:**
- `exit_date IS NULL` → car is active/in-shop. Use `.is("exit_date", null)` to filter these.
- `exit_date IS NOT NULL` → car is completed/delivered. Use `.not("exit_date", "is", null)`.
- `total_amount` is income; `vehicle_expense` is expense. Net profit = `total_amount - vehicle_expense`.
- `payment_method` values: `"cash"`, `"havale"`, `"kredi_karti"`, `"cek"` — import from `config/constants.js`.

---

### `staff`
```sql
id            UUID PK DEFAULT uuid_generate_v4()
name          TEXT NOT NULL
role          TEXT              ← e.g. "Kaportacı", "Boyacı" — free text
fixed_salary  NUMERIC DEFAULT 0 ← monthly base salary in TRY
created_at    TIMESTAMP DEFAULT now()
```
**Business logic:** Staff are referenced by `services.staff_id`. Deleting a staff member sets `services.staff_id = NULL` (SET NULL on delete). `fixed_salary` is used in the staff report: net payout = `fixed_salary - advances`.

---

### `staff_loans`
```sql
id         UUID PK DEFAULT uuid_generate_v4()
staff_id   UUID NOT NULL → staff.id CASCADE DELETE
amount     NUMERIC NOT NULL         ← amount of salary advance
loan_date  DATE NOT NULL DEFAULT CURRENT_DATE
created_at TIMESTAMP DEFAULT now()
```
**Business logic:** These are salary advances (avans), not external loans. Used in the staff report to calculate `net_payout = fixed_salary - total_advances_in_period`. The `/staff-loans` route is write-only; reading happens via `getStaffReport()`.

---

### `services`
```sql
id            UUID PK DEFAULT uuid_generate_v4()
visit_id      UUID → visits.id CASCADE DELETE
service_type  TEXT NOT NULL   ← see SERVICE_TYPES in constants.js
staff_id      UUID → staff.id ON DELETE SET NULL  ← nullable; staff may be unassigned
price         NUMERIC         ← per-service price (not the visit total)
notes         TEXT
created_at    TIMESTAMP DEFAULT now()
```
**Business logic:**
- One visit can have multiple services. Services are the line items.
- `service_type` values: `"painting"`, `"bodywork"`, `"pdr"`, `"detailing"`, `"polishing"`, `"ceramic"`, `"ppf"`, `"mechanical"`.
- On update, services are **deleted and re-inserted** — never patched individually.
- `price` here is per-service. `visits.total_amount` is the grand total charged to the customer; these two can differ (e.g. discounts, combined pricing).

---

## The 8 Coding Patterns — Pulled from the Actual Codebase

### Pattern 1: Query functions in `lib/queries.js`

Every read operation is a named exported async function. The real shape from the codebase:

```javascript
// lib/queries.js
import { createClient } from "@/lib/supabase";

// ── Private helpers ──────────────────────────────────────────────────

function dedupeById(rows) {
  // REQUIRED after any !inner join — Supabase multiplies rows for each match
  const seen = new Set();
  return (rows ?? []).filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function ilike(value) {
  return `%${value.trim()}%`;
}

function formatVisitRow(row) {
  const car = row.cars;
  const customer = car?.customers;
  return {
    id: row.id,
    licensePlate: car?.license_plate ?? "—",
    customerName: customer?.name ?? "—",
    phone: customer?.phone ?? "—",
    entryDate: row.entry_date,
    exitDate: row.exit_date,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    // ... flatten nested joins into a flat object for easy use in UI
    serviceTypes: (row.services ?? []).map((s) => s.service_type).filter(Boolean),
    staffNames: [...new Set((row.services ?? []).map((s) => s.staff?.name).filter(Boolean))],
    serviceDetails: (row.services ?? []).map((s) => ({
      type: s.service_type,
      price: s.price,
      notes: s.notes,
      staffName: s.staff?.name,
    })),
  };
}

// ── Exported query ───────────────────────────────────────────────────

export async function getVisits(filters = {}) {
  const { licensePlate = "", status = "", serviceType = "", staffId = "" } = filters;
  const supabase = await createClient();

  // Use !inner ONLY when you must filter by that relation
  // Without a filter, use plain "services" to avoid row multiplication
  const needsServiceJoin = Boolean(serviceType || staffId);
  const servicesJoin = needsServiceJoin ? "services!inner" : "services";

  let query = supabase
    .from("visits")
    .select(`
      id, entry_date, exit_date, total_amount, payment_method,
      cars!inner (
        id, license_plate, vehicle_type, model, color, vin,
        customers!inner ( name, phone, company_name )
      ),
      ${servicesJoin} (
        service_type, staff_id, price, notes,
        staff ( name, role )
      )
    `)
    .order("entry_date", { ascending: false });

  if (status === "active")    query = query.is("exit_date", null);
  if (status === "completed") query = query.not("exit_date", "is", null);
  if (licensePlate.trim())    query = query.ilike("cars.license_plate", ilike(licensePlate));
  if (serviceType)            query = query.eq("services.service_type", serviceType);

  const { data, error } = await query;

  if (error) {
    console.error("getVisits error:", error.message);
    return { visits: [], error: error.message };
  }

  // dedupeById is MANDATORY when using !inner joins
  return { visits: dedupeById(data).map(formatVisitRow), error: null };
}
```

**Return contract:** `{ items: [], error: "message" }` on failure. `{ items: data ?? [], error: null }` on success. Always use the domain-specific key name (`visits`, `staff`, `car`) not a generic `items`.

---

### Pattern 2: Upsert by phone (customers) and by plate (cars)

This is how `upsertCustomerAndCar` works in `lib/actions.js`. Never INSERT blindly — always look up first:

```javascript
// From lib/actions.js — the exact pattern used in production
async function upsertCustomerAndCar(supabase, data) {
  let customerId;

  // Step 1: Look up customer by phone (the unique business key)
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.customerPhone)  // ← always .eq("phone", ...) — not name
    .maybeSingle();                   // ← maybeSingle returns null if not found, no error

  if (existingCustomer) {
    customerId = existingCustomer.id;
    // Update name/company in case they changed
    await supabase
      .from("customers")
      .update({ name: data.customerName, company_name: data.companyName })
      .eq("id", customerId);
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({ name: data.customerName, phone: data.customerPhone, company_name: data.companyName })
      .select("id")
      .single();
    if (customerError) return { error: `Müşteri oluşturulamadı: ${customerError.message}` };
    customerId = newCustomer.id;
  }

  let carId;

  // Step 2: Look up car by license plate (the unique business key)
  const { data: existingCar } = await supabase
    .from("cars")
    .select("id")
    .eq("license_plate", data.licensePlate)  // ← always .eq("license_plate", ...)
    .maybeSingle();

  if (existingCar) {
    carId = existingCar.id;
    await supabase
      .from("cars")
      .update({ customer_id: customerId, vehicle_type: data.vehicleType, model: data.model, color: data.color, vin: data.vin })
      .eq("id", carId);
  } else {
    const { data: newCar, error: carError } = await supabase
      .from("cars")
      .insert({ customer_id: customerId, license_plate: data.licensePlate, vehicle_type: data.vehicleType, model: data.model, color: data.color, vin: data.vin })
      .select("id")
      .single();
    if (carError) return { error: `Araç oluşturulamadı: ${carError.message}` };
    carId = newCar.id;
  }

  return { customerId, carId };
}
```

---

### Pattern 3: Delete-and-reinsert for child records (services)

Never patch individual service rows. Delete all and re-insert. From `lib/actions.js`:

```javascript
// From lib/actions.js — saveServices()
async function saveServices(supabase, visitId, services) {
  // Step 1: Delete ALL existing services for this visit
  const { error: deleteError } = await supabase
    .from("services")
    .delete()
    .eq("visit_id", visitId);

  if (deleteError) {
    return { error: `Mevcut hizmetler silinemedi: ${deleteError.message}` };
  }

  // Step 2: Re-insert fresh (skip if empty)
  if (services.length === 0) return {};

  const serviceRows = services.map((s) => ({
    visit_id: visitId,
    service_type: s.service_type,
    staff_id: s.staff_id || null,
    price: parseFloat(s.price) || 0,
    notes: s.notes || null,
  }));

  const { error: servicesError } = await supabase.from("services").insert(serviceRows);
  if (servicesError) return { error: `Hizmetler kaydedilemedi: ${servicesError.message}` };

  return {};
}
```

This is called in both `createVisit` and `updateVisit`. Same code path, same pattern.

---

### Pattern 4: Action functions in `lib/actions.js`

The file starts with `"use server"`. The full lifecycle: parse → validate → DB write → revalidate → redirect. From the actual file:

```javascript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Private helper: parse and validate form data BEFORE touching DB
function parseVisitFormData(formData) {
  const data = {
    customerName: formData.get("customerName")?.toString().trim(),
    customerPhone: formData.get("customerPhone")?.toString().trim(),
    licensePlate: formData.get("licensePlate")?.toString().trim().toUpperCase(),
    entryDate: formData.get("entryDate")?.toString(),
    totalAmount: parseFloat(formData.get("totalAmount")?.toString() || "0"),
    // ... all other fields
  };

  if (!data.customerName || !data.customerPhone) return { error: "Müşteri adı ve telefon zorunludur." };
  if (!data.licensePlate) return { error: "Plaka zorunludur." };
  if (!data.entryDate) return { error: "Giriş tarihi zorunludur." };

  return { data };
}

// Private helper: revalidate every page that shows this data
function revalidateVisitPaths(visitId, carId) {
  revalidatePath("/dashboard");
  revalidatePath(`/visits/${visitId}`);
  revalidatePath(`/visits/${visitId}/edit`);
  if (carId) revalidatePath(`/cars/${carId}`);
}

// Exported action: called from client components via form action
export async function createVisit(formData) {
  const parsed = parseVisitFormData(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data } = parsed;

  const upsertResult = await upsertCustomerAndCar(supabase, data);
  if (upsertResult.error) return { error: upsertResult.error };

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert({ car_id: upsertResult.carId, entry_date: data.entryDate, /* ... */ })
    .select("id")
    .single();

  if (visitError) return { error: `Ziyaret oluşturulamadı: ${visitError.message}` };

  const servicesResult = await saveServices(supabase, visit.id, data.services);
  if (servicesResult.error) return { error: servicesResult.error };

  revalidateVisitPaths(visit.id, upsertResult.carId);
  redirect(`/visits/${visit.id}`);  // redirect, not return, on success
}

// For actions that don't redirect (like adding a loan):
export async function addStaffLoan(formData) {
  // ... validate ...
  const { error } = await supabase.from("staff_loans").insert({ staff_id, amount, loan_date });
  if (error) return { error: `Avans kaydedilemedi: ${error.message}` };
  revalidatePath("/staff-loans");
  return { success: true };  // return success, don't redirect
}
```

---

### Pattern 5: Parallel queries in `lib/reportQueries.js`

Run independent queries in parallel with `Promise.all`. The hub uses 4 queries simultaneously:

```javascript
// From lib/reportQueries.js — getHubStats()
export async function getHubStats() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  // Run all 4 queries simultaneously — not one after another
  const [incomeRes, activeCarsRes, completedTodayRes, advancesRes] = await Promise.all([
    supabase.from("visits").select("total_amount").eq("entry_date", today),
    // COUNT query: head: true means "don't return rows, just count"
    supabase.from("visits").select("id", { count: "exact", head: true }).is("exit_date", null),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("exit_date", today),
    supabase.from("staff_loans").select("amount").gte("loan_date", monthStart).lte("loan_date", today),
  ]);

  return {
    todayIncome: (incomeRes.data ?? []).reduce((s, v) => s + (parseFloat(v.total_amount) || 0), 0),
    activeCarsCount: activeCarsRes.count ?? 0,  // use .count, not .data.length
    completedToday: completedTodayRes.count ?? 0,
    staffAdvancesThisMonth: (advancesRes.data ?? []).reduce((s, l) => s + (l.amount ?? 0), 0),
  };
}
```

For the staff report, 3 queries run in parallel — staff list, loans, and services:

```javascript
// From lib/reportQueries.js — getStaffReport()
const [staffRes, loansRes, servicesRes] = await Promise.all([
  supabase.from("staff").select("id, name, role, fixed_salary").order("name"),
  loansQuery,     // already has date filters applied above
  servicesQuery,  // already has date filters applied above
]);

if (staffRes.error) return { error: staffRes.error.message };
if (loansRes.error) return { error: loansRes.error.message };
// Note: servicesRes error is intentionally not fatal in the current code

// Aggregate in JavaScript, not SQL
const loansByStaff = {};
for (const l of loansRes.data ?? []) {
  if (!loansByStaff[l.staff_id]) loansByStaff[l.staff_id] = [];
  loansByStaff[l.staff_id].push(l);
}
```

---

### Pattern 6: Date presets as `<a>` links (not buttons)

Presets are navigation links, not form submissions. From `app/reports/financial/page.jsx`:

```jsx
// In a server component:
import { getDatePresets } from "@/lib/datePresets";

const presets = getDatePresets();
// Returns: [
//   { label: "Bugün",    dateFrom: "2026-07-08", dateTo: "2026-07-08" },
//   { label: "Bu Hafta", dateFrom: "2026-07-07", dateTo: "2026-07-08" },
//   { label: "Bu Ay",    dateFrom: "2026-07-01", dateTo: "2026-07-08" },
//   { label: "Bu Yıl",  dateFrom: "2026-01-01", dateTo: "2026-07-08" },
// ]

// Render as <a> links, not <button> elements
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

// Manual date range uses a plain GET form (not a Server Action)
<form method="GET" className="flex flex-wrap items-end gap-4">
  <input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} ... />
  <input id="dateTo"   name="dateTo"   type="date" defaultValue={dateTo}   ... />
  <button type="submit">Getir</button>
</form>
```

**Staff page** uses `getThisMonthRange()` as a default so data is always shown on load:

```javascript
// app/reports/staff/page.jsx — always has a default range
const defaultRange = getThisMonthRange();
const dateFrom = sp?.dateFrom ?? defaultRange.dateFrom;  // default to month start
const dateTo   = sp?.dateTo   ?? defaultRange.dateTo;    // default to today
const result = await getStaffReport({ dateFrom, dateTo }); // always fetches
```

**Financial page** intentionally shows an empty state until user picks a date:

```javascript
// app/reports/financial/page.jsx — no default; shows prompt state
const dateFrom = sp?.dateFrom ?? "";
const dateTo   = sp?.dateTo   ?? "";
const result = dateFrom || dateTo
  ? await getReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  : null;  // null = show empty state prompt
```

---

### Pattern 7: Deduplication after `!inner` joins

When you use `cars!inner` or `services!inner`, Supabase multiplies rows. The rule: if you used `!inner`, you must call `dedupeById()`. From `lib/queries.js`:

```javascript
// getVisits dynamically switches between !inner and plain join
const needsServiceJoin = Boolean(serviceType || staffId);
const servicesJoin = needsServiceJoin ? "services!inner" : "services";
// ^ Only use !inner when you're filtering by that relation

// After the query:
return { visits: dedupeById(data).map(formatVisitRow), error: null };
// ^ dedupeById is always called because cars!inner is always used in getVisits
```

`dedupeById` is a local helper in `queries.js` — it's not exported. Each query file has its own copy if needed. The pattern:

```javascript
function dedupeById(rows) {
  const seen = new Set();
  return (rows ?? []).filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}
```

---

### Pattern 8: Server pages — data fetching without API routes

Pages under `app/` are Server Components. They call query functions directly — no `useEffect`, no `fetch`, no API routes. The exact shape from the codebase:

```jsx
// app/something/page.jsx
import { DashboardShell } from "@/components/ui/DashboardShell";
import { getSomething } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Sayfa Başlığı — Oto Servis CRM" };

export default async function SomethingPage({ searchParams }) {
  const sp = await searchParams;  // always await searchParams in Next.js App Router
  const filter = sp?.filter ?? "";

  const { items, error } = await getSomething({ filter });

  if (error) {
    return (
      <DashboardShell>
        <div className="p-8 text-sm text-red-600">Hata: {error}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <p className="text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-blue-600">Panel</Link>
          {" / Sayfa Adı"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Başlık</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* content */}
      </main>
    </DashboardShell>
  );
}
```

For client components (need `useState`, event handlers):

```jsx
// app/staff-loans/StaffLoansClient.jsx
"use client";

import { useState } from "react";
import { addStaffLoan } from "@/lib/actions";

export default function StaffLoansClient({ staff }) {
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    const result = await addStaffLoan(formData);  // call Server Action directly
    if (result?.error) setError(result.error);
    // on success: result.success === true, clear form or show toast
  }

  return (
    <form action={handleSubmit}>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </form>
  );
}
```

---

## Standard UI Component Patterns

These are the exact Tailwind patterns used across the codebase. Match them exactly.

**Summary card (color variants: `blue`, `green`, `red`, `slate`, `purple`, `amber`):**
```jsx
<div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Etiket</p>
  <p className="mt-3 text-3xl font-extrabold text-blue-800">{value}</p>
  <p className="mt-1 text-xs text-blue-400">Alt başlık</p>
</div>
```

**Section with icon header:**
```jsx
<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
    <span className="text-xl">🔧</span>
    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Bölüm Başlığı</h2>
  </div>
  <div className="p-6">{/* content */}</div>
</div>
```

**Error message:**
```jsx
<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
  Hata mesajı buraya
</div>
```

**Empty state:**
```jsx
<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
  <span className="mb-4 text-5xl">🚗</span>
  <p className="text-lg font-semibold text-slate-700">Kayıt bulunamadı</p>
  <p className="mt-1 text-sm text-slate-400">Açıklama metni</p>
</div>
```

**Data table:**
```jsx
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-slate-100 text-sm">
    <thead>
      <tr className="bg-slate-50">
        <th className="py-3 pl-4 pr-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sütun</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map((row) => (
        <tr key={row.id} className="hover:bg-slate-50">
          <td className="whitespace-nowrap py-3 pl-4 pr-6 text-slate-700">{row.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Breadcrumb (every page must have one):**
```jsx
<p className="text-sm text-slate-500">
  <Link href="/dashboard" className="hover:text-blue-600">Panel</Link>
  {" / "}
  <Link href="/reports" className="hover:text-blue-600">Raporlar</Link>
  {" / Sayfa Adı"}
</p>
```

---

## Reports System Map

Four pages. Each has a distinct role. Never mix them up.

| Page | Role | Default date | Query function | Key behavior |
|---|---|---|---|---|
| `/reports` | Hub — today's live stats + nav | Always "today" | `getHubStats()` | No date filter. Shows 4 stat cards + 3 nav tiles. |
| `/reports/financial` | Income/expense analysis | **None** — shows empty state | `getReport({ dateFrom, dateTo })` | No date = show prompt. Data only after user picks range. |
| `/reports/operations` | Active cars + completed history | **None for completed** | `getOperationsReport({ dateFrom, dateTo })` | Active cars always shown (no date needed). Completed list filtered by date. |
| `/reports/staff` | Performance + advances vs salary | **This month** | `getStaffReport({ dateFrom, dateTo })` | Always renders data. Defaults to current month via `getThisMonthRange()`. |

**What `getReport()` returns:**
```javascript
{
  error: null,
  summary: { totalIncome, totalExpenses, netProfit, visitCount, completedCount, activeCount },
  byPaymentMethod: [{ method, count, total }],   // sorted by total desc
  byServiceType:   [{ type, count, total }],     // sorted by total desc
  byStaff:         [{ id, name, role, count, total }], // sorted by total desc
  byVehicle:       [{ id, licensePlate, model, customerName, visitCount, totalIncome, totalExpenses, netProfit }],
  byInsurance:     [{ insurance, count, total }] // null insurance entries filtered out
}
```

**What `getHubStats()` returns:**
```javascript
{
  todayIncome: number,           // sum of total_amount where entry_date = today
  activeCarsCount: number,       // COUNT where exit_date IS NULL
  completedToday: number,        // COUNT where exit_date = today
  staffAdvancesThisMonth: number // sum of staff_loans.amount for current month
}
```

---

## How to Add a New Feature

Follow this order every time.

### Step 1 — DB change needed?

If yes, create a migration first:
```bash
make migration name=describe_the_change
# write SQL in the generated file
make deploy
make status   # confirm "Applied"
```
Then update `supabase/schema.sql` to match.

Migration SQL rules:
- Always `IF NOT EXISTS` for `CREATE TABLE` / `ADD COLUMN`
- Always `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Never modify existing migration files

### Step 2 — Add read queries

- Simple CRUD reads → `lib/queries.js`
- Aggregated report data → `lib/reportQueries.js`

### Step 3 — Add write actions

Add to `lib/actions.js`:
1. Parse and validate
2. DB write
3. `revalidatePath()` for all affected pages
4. `redirect()` or `return { success: true }`

### Step 4 — Build the UI

- Server component if it just displays data
- Add `"use client"` only if it needs interactivity
- All labels and messages in Turkish
- Tailwind classes only — no `style={{}}`
- Always use `@/` imports

### Step 5 — Test locally

```bash
npm run dev
# open http://localhost:3000
```

### Step 6 — Deploy

```bash
# DB change: always DB first, frontend second
make deploy
git push origin main

# No DB change:
git add . && git commit -m "feat: describe what you added"
git push origin main
```

---

## Debugging Guide

| Symptom | Look here first |
|---|---|
| Page shows wrong or missing data | `lib/queries.js` — check SELECT shape and filters |
| Form saves but screen doesn't update | `lib/actions.js` — is `revalidatePath()` called for this page? |
| Form submit returns an error | `lib/actions.js` — check validation logic and Supabase error message |
| "column does not exist" crash | DB column missing — write a migration |
| Auth redirect loop | `middleware.js` or `.env.local` (wrong Supabase URL/key) |
| Duplicate rows in query results | Missing `dedupeById()` — you used `!inner` join without deduplication |
| Client component can't access DB | You called `createClient()` inside a `"use client"` file — move to server |
| Page data is stale after action | `revalidatePath()` missing or pointing to wrong path |
| `searchParams` TypeError | You forgot to `await searchParams` in the page component |
| `maybeSingle()` returning error | You used `.single()` where record might not exist — switch to `.maybeSingle()` |

---

## The 10 Hard Rules — Breaking These Breaks the App

1. **Never commit `.env.local`** — it contains the Supabase service role key which bypasses all security.
2. **Never change the database through the Supabase console** — use `make migration` + `make deploy`. Console changes won't be in migrations and will be lost or cause drift.
3. **Never modify existing migration files** — they are immutable history. Add new migration files.
4. **Never put database logic inside page files** — all SELECT goes in `lib/queries.js`, all writes in `lib/actions.js`. No exceptions.
5. **Never use `SUPABASE_SERVICE_ROLE_KEY` in client-side code** — it bypasses RLS and exposes all data.
6. **Never add `"use client"` to a file that calls `createClient()`** — the server Supabase client uses cookies and only works server-side.
7. **Never use TypeScript** — this is a JavaScript-only project. All files are `.js` or `.jsx`.
8. **Never use inline `style={{}}`** — Tailwind classes only. No exceptions.
9. **Never use relative imports like `../../lib/something`** — always use `@/lib/something`.
10. **Never deploy frontend before DB migration** — if the code references a column that doesn't exist yet, the app crashes in production for all users.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://hgrgcppgdtqlgpxlwyug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9O7wY1EiQDYtRHT2Th-ReA_9wiT3i5v
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

These go in `.env.local` locally and in Vercel dashboard for production.

---

## Makefile Reference

```bash
make link          # First time: link local project to Supabase project
make migration     # Create a new empty migration file (use: make migration name=add_column)
make deploy        # Apply pending migrations to Supabase
make status        # Check which migrations are applied
```

---

## Prompt Templates — Good vs Bad

Use these as templates when asking your AI to build new features.

---

### ❌ BAD prompt

> "Add a notes field to the staff table and show it on the staff report page."

**Why it fails:** No context about patterns. The AI will likely:
- Write a migration with wrong SQL style
- Add a Supabase query directly in the page component (breaks Pattern 1)
- Use TypeScript types
- Forget `revalidatePath()`
- Write English labels

---

### ✅ GOOD prompt (copy this template)

> Read GEMINI.md before doing anything.
>
> I need to add a `notes` field (TEXT, nullable) to the `staff` table and display it on the staff report page at `/reports/staff`.
>
> Follow these steps in order:
> 1. Create a migration using `make migration name=add_staff_notes`. The SQL must use `ALTER TABLE staff ADD COLUMN IF NOT EXISTS notes TEXT;`. Do not modify any existing migration file.
> 2. After creating the migration, update `supabase/schema.sql` to add the `notes` column to the staff table definition.
> 3. In `lib/reportQueries.js`, update the `getStaffReport()` function to include `notes` in the staff SELECT query. Follow Pattern 5 (parallel queries, aggregate in JS).
> 4. In `app/reports/staff/page.jsx`, add a "Notlar" column to the staff table. Use the existing Tailwind table pattern (th/td classes match what's already there).
> 5. All new text must be in Turkish.
> 6. No TypeScript. No inline styles. No relative imports.
> 7. Run `npm run dev` mentally and describe what the result looks like before writing anything.

---

### ✅ GOOD prompt — adding a new report section

> Read GEMINI.md before doing anything.
>
> I want a new section on the financial report page (`/reports/financial`) that shows a breakdown of visits grouped by `insurance` company — only visits that have a non-null `insurance` value.
>
> Rules:
> - The data already exists in `getReport()` as `byInsurance` — use it. Do NOT add a new query.
> - Add a new `<Section>` component with icon `🛡️` and title `Sigortaya Göre` below the existing sections.
> - Each row shows: insurance company name, visit count badge, and total amount as a bar (use the existing `<BarRow>` pattern already in the file).
> - If `byInsurance` is empty, show `<EmptyState message="Bu aralıkta sigorta verisi yok." />`.
> - No new files. Edit only `app/reports/financial/page.jsx`.
> - Tailwind only. Turkish labels.

---

### ✅ GOOD prompt — fixing a bug

> Read GEMINI.md before doing anything.
>
> On the dashboard, when I filter visits by `serviceType`, I see duplicate visit rows. For example, a visit with 2 painting services shows up twice.
>
> This is the `!inner` join duplication bug described in Pattern 7 of GEMINI.md.
>
> Fix: In `lib/queries.js`, confirm that `dedupeById(data)` is called on the result of `getVisits()` before mapping. If it's missing, add it. Do not change any other file.

---

### ✅ GOOD prompt — new write action

> Read GEMINI.md before doing anything.
>
> I need a way to delete a staff loan from the `/staff-loans` page. There's already an `addStaffLoan` action in `lib/actions.js`. Add a `deleteStaffLoan(loanId)` action following the same pattern:
> - Validate that `loanId` is present
> - Delete from `staff_loans` where `id = loanId`
> - On error, return `{ error: "Avans silinemedi: ..." }` in Turkish
> - On success, call `revalidatePath("/staff-loans")` and return `{ success: true }`
> - Do NOT redirect — this is an inline delete, not a form submission that navigates away
>
> Then add a delete button to the loan list in the staff loans page. The button should call this action. Use `"use client"` in a separate `DeleteLoanButton.jsx` component if needed. No TypeScript. No inline styles.

---

## Formatting Utilities

```javascript
import { formatCurrency, formatDate } from "@/lib/format";

formatCurrency(12500)       // → "₺12.500,00"  (Turkish locale, TRY)
formatCurrency(null)        // → "₺0,00"        (null-safe)
formatDate("2026-07-08")    // → "08 Temmuz 2026"
formatDate(null)            // → "—"
```

---

## Service Types (from `config/constants.js`)

```javascript
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/config/constants";

SERVICE_TYPES = [
  { value: "painting",   label: "Boya" },
  { value: "bodywork",   label: "Kaporta" },
  { value: "pdr",        label: "PDR" },
  { value: "detailing",  label: "Detaylı Temizlik" },
  { value: "polishing",  label: "Pasta Cila" },
  { value: "ceramic",    label: "Seramik Kaplama" },
  { value: "ppf",        label: "PPF" },
  { value: "mechanical", label: "Mekanik" },
]

SERVICE_TYPE_LABELS["painting"]  // → "Boya"
SERVICE_TYPE_LABELS["bodywork"]  // → "Kaporta"
```

## Payment Methods (from `config/constants.js`)

```javascript
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/config/constants";

PAYMENT_METHODS = [
  { value: "cash",        label: "Nakit" },
  { value: "havale",      label: "Havale" },
  { value: "kredi_karti", label: "Kredi Kartı" },
  { value: "cek",         label: "Çek" },
]

PAYMENT_METHOD_LABELS["cash"]        // → "Nakit"
PAYMENT_METHOD_LABELS["kredi_karti"] // → "Kredi Kartı"
```

---

*Keep this file up to date whenever you add new patterns, tables, or routes. It is the single source of truth for any AI working on this codebase.*
