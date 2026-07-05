# AI Developer Onboarding — Auto Repair Shop CRM

**For any AI assistant (Gemini, Claude, GPT, or other).**
Read this entire file before writing a single line of code.
Then read the files listed in the Mandatory Reading section.
Do not skip steps. Do not assume. Read first, then work.

---

## Mandatory Reading — Do This First

Before touching anything, read these files in this order:

```
1. CLAUDE.md or GEMINI.md          ← you are reading this now
2. lib/queries.js                  ← understand how data is read
3. lib/actions.js                  ← understand how data is written
4. lib/reportQueries.js            ← understand aggregation patterns
5. lib/datePresets.js              ← understand the date utility
6. config/constants.js             ← understand service types, payment methods, nav
7. app/reports/page.jsx            ← hub page pattern
8. app/reports/financial/page.jsx  ← full report page pattern
9. app/reports/staff/page.jsx      ← staff report pattern
10. components/ui/Sidebar.jsx      ← nav structure
```

If you do not read these files, your code will not match the codebase and will be rejected.

---

## What This App Is

An internal CRM for an **auto repair and bodywork shop**. Staff use it to:
- Record customers and their vehicles
- Track workshop visits (entry/exit, services performed, costs)
- Record staff salary advances (loans)
- View financial, operational, and staff reports

There is no public-facing content. All routes require login.
The UI language is **Turkish**. All labels, messages, and button text must be in Turkish.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16.2.9 App Router | Server Components by default |
| UI | React 19.2.4 | `"use client"` only when needed |
| Styling | Tailwind CSS 4.x | No inline styles. No CSS files. Tailwind only. |
| Database | Supabase (PostgreSQL 15) | REST API via supabase-js |
| Auth | Supabase Auth — email only | All routes protected by middleware |
| DB client | @supabase/ssr + @supabase/supabase-js | Server-side only |
| Language | JavaScript | NO TypeScript. No `.ts` or `.tsx` files. |
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
└── reports/                  Hub — daily quick stats + navigation to sub-reports
    ├── financial/            Income, expenses, profit by payment/service/staff/insurance/vehicle
    ├── operations/           Active cars, completed in period, avg days, parts counts
    └── staff/                Staff performance + advances vs salary (defaults to this month)

lib/
├── supabase.js               Creates server Supabase client (uses cookies for auth)
├── supabase/middleware.js     Refreshes auth session on every request
├── queries.js                ALL read operations — every SELECT query lives here
├── actions.js                ALL write operations — "use server" file, INSERT/UPDATE/DELETE
├── reportQueries.js          Aggregation queries for all report pages
├── datePresets.js            Date range presets: Today, This Week, This Month, This Year
├── auth.js                   Login / logout helpers
└── format.js                 formatCurrency(), formatDate(), formatPhone()

components/
├── ui/
│   ├── DashboardShell.jsx    Page wrapper — sidebar + main content area
│   ├── Sidebar.jsx           Navigation sidebar (reads NAV_ITEMS from config/constants.js)
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
    └── 20260705000000_baseline.sql

middleware.js                 Protects all routes — redirects unauthenticated → /login
Makefile                      make migration / make deploy / make status / make link
.env.local                    Local secrets (gitignored — never commit)
```

---

## Database Schema

Six tables. All have RLS enabled. All require authentication.

### customers
```
id            UUID PK
name          TEXT NOT NULL
phone         TEXT NOT NULL  ← unique business identifier, used for upsert lookups
company_name  TEXT
created_at    TIMESTAMP
```

### cars
```
id             UUID PK
customer_id    UUID → customers.id CASCADE DELETE
license_plate  TEXT UNIQUE NOT NULL  ← unique business identifier, used for upsert lookups
vehicle_type   TEXT
model          TEXT
color          TEXT
vin            TEXT
created_at     TIMESTAMP
```

### visits
```
id                         UUID PK
car_id                     UUID → cars.id CASCADE DELETE
entry_date                 DATE NOT NULL
exit_date                  DATE  ← NULL means car is still in the shop
requires_chassis_alignment BOOLEAN DEFAULT false
painted_parts_count        INTEGER DEFAULT 0
bodywork_parts_count       INTEGER DEFAULT 0
total_amount               NUMERIC  ← total charged to customer
payment_method             TEXT  ← "cash", "havale", "kredi_karti", "cek"
insurance                  TEXT  ← insurance company name if applicable
vehicle_expense            NUMERIC DEFAULT 0  ← cost of parts/materials
notes                      TEXT
created_at                 TIMESTAMP
```

### staff
```
id            UUID PK
name          TEXT NOT NULL
role          TEXT
fixed_salary  NUMERIC DEFAULT 0  ← monthly base salary
created_at    TIMESTAMP
```

### staff_loans
```
id         UUID PK
staff_id   UUID NOT NULL → staff.id CASCADE DELETE
amount     NUMERIC NOT NULL
loan_date  DATE NOT NULL DEFAULT CURRENT_DATE
created_at TIMESTAMP
```

### services
```
id            UUID PK
visit_id      UUID → visits.id CASCADE DELETE
service_type  TEXT NOT NULL  ← "painting", "bodywork", "pdr", "detailing", etc.
staff_id      UUID → staff.id SET NULL on delete
price         NUMERIC
notes         TEXT
created_at    TIMESTAMP
```

---

## The 8 Coding Patterns — Follow These Exactly

### Pattern 1: Query functions in lib/queries.js

Every read operation is a named exported async function. Always:
- `await createClient()` at the top
- Return `{ items: [], error: error.message }` on failure
- Return `{ items: data ?? [], error: null }` on success
- Use `!inner` join only when you MUST filter by that relation
- Deduplicate when using `!inner` joins (they create duplicate rows)

```javascript
// lib/queries.js
import { createClient } from "@/lib/supabase";

function dedupeById(rows) {
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

export async function getThings(filters = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("visits")
    .select(`
      id,
      entry_date,
      cars!inner (
        id,
        license_plate,
        customers!inner (
          name,
          phone
        )
      ),
      services (
        service_type,
        price,
        staff ( name, role )
      )
    `)
    .order("entry_date", { ascending: false });

  if (filters.licensePlate) query = query.ilike("cars.license_plate", ilike(filters.licensePlate));
  if (filters.status === "active") query = query.is("exit_date", null);

  const { data, error } = await query;

  if (error) {
    console.error("getThings error:", error.message);
    return { things: [], error: error.message };
  }

  return { things: dedupeById(data).map(formatRow), error: null };
}
```

**IMPORTANT:** When you use `cars!inner` or `customers!inner`, Supabase multiplies rows for each match. Always run `dedupeById()` on the result.

---

### Pattern 2: Action functions in lib/actions.js

The file starts with `"use server"`. Every write operation is a named exported async function.

Rules:
- Extract helpers: parse/validate → business logic → DB write → revalidate
- Validate all inputs BEFORE touching the database
- Call `revalidatePath()` for EVERY page that shows the changed data
- Return `{ error: "Turkish error message" }` on failure
- Use `redirect()` (not return) after successful create/update
- Return `{ success: true }` for actions that don't redirect (e.g., add staff loan)

```javascript
// lib/actions.js
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Private helpers — not exported
function parseMyFormData(formData) {
  const name = formData.get("name")?.toString().trim();
  const amount = parseFloat(formData.get("amount")?.toString() || "0");

  if (!name) return { error: "Ad zorunludur." };
  if (!amount || amount <= 0) return { error: "Geçerli bir tutar giriniz." };

  return { data: { name, amount } };
}

function revalidateAffectedPaths(id) {
  revalidatePath("/dashboard");
  revalidatePath(`/items/${id}`);
}

// Exported — callable from client components
export async function createThing(formData) {
  const parsed = parseMyFormData(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();
  const { data } = parsed;

  const { data: newThing, error } = await supabase
    .from("things")
    .insert({ name: data.name, amount: data.amount })
    .select("id")
    .single();

  if (error) {
    return { error: `Kayıt oluşturulamadı: ${error.message}` };
  }

  revalidateAffectedPaths(newThing.id);
  redirect(`/things/${newThing.id}`);
}

export async function updateThing(formData) {
  const id = formData.get("id")?.toString();
  if (!id) return { error: "ID gerekli." };

  const parsed = parseMyFormData(formData);
  if (parsed.error) return { error: parsed.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("things")
    .update({ name: parsed.data.name })
    .eq("id", id);

  if (error) return { error: `Güncellenemedi: ${error.message}` };

  revalidateAffectedPaths(id);
  redirect(`/things/${id}`);
}
```

**The upsert pattern for customers/cars:** Never assume a customer or car is new. Always look up by phone (customers) or license_plate (cars), update if exists, insert if not:

```javascript
// From the actual codebase — how customers are handled
const { data: existingCustomer } = await supabase
  .from("customers")
  .select("id")
  .eq("phone", data.customerPhone)
  .maybeSingle();

if (existingCustomer) {
  customerId = existingCustomer.id;
  await supabase.from("customers").update({ name: data.customerName }).eq("id", customerId);
} else {
  const { data: newCustomer } = await supabase
    .from("customers")
    .insert({ name: data.customerName, phone: data.customerPhone })
    .select("id")
    .single();
  customerId = newCustomer.id;
}
```

**The delete-and-reinsert pattern for child records:**
When updating services (or any one-to-many child), delete all existing then insert fresh:

```javascript
// Delete all services for this visit, then insert new ones
await supabase.from("services").delete().eq("visit_id", visitId);
if (services.length > 0) {
  await supabase.from("services").insert(services.map(s => ({ visit_id: visitId, ...s })));
}
```

---

### Pattern 3: Report queries in lib/reportQueries.js

Report queries fetch raw data with full joins, then aggregate in JavaScript — NOT in SQL. This is intentional: JS aggregation is easier to extend.

```javascript
// lib/reportQueries.js
import { createClient } from "@/lib/supabase";

export async function getMyReport({ dateFrom, dateTo } = {}) {
  const supabase = await createClient();

  // Run independent queries in parallel
  const [visitsRes, loansRes] = await Promise.all([
    supabase.from("visits").select("id, total_amount, entry_date").gte("entry_date", dateFrom),
    supabase.from("staff_loans").select("amount, loan_date").gte("loan_date", dateFrom),
  ]);

  if (visitsRes.error) return { error: visitsRes.error.message };
  if (loansRes.error) return { error: loansRes.error.message };

  // Aggregate in JS
  const visits = visitsRes.data ?? [];
  const loans = loansRes.data ?? [];
  const totalIncome = visits.reduce((s, v) => s + (parseFloat(v.total_amount) || 0), 0);
  const totalLoans = loans.reduce((s, l) => s + (l.amount ?? 0), 0);

  return { error: null, summary: { totalIncome, totalLoans } };
}
```

For the hub stats, use `{ count: "exact", head: true }` for COUNT queries:

```javascript
const { count } = await supabase
  .from("visits")
  .select("id", { count: "exact", head: true })
  .is("exit_date", null);
// count = number of active cars
```

---

### Pattern 4: Date presets in lib/datePresets.js

Every report page that filters by date uses `getDatePresets()`. Never compute dates inline in a page component.

```javascript
import { getDatePresets, getThisMonthRange } from "@/lib/datePresets";

// In a server component:
const presets = getDatePresets(); // returns [{label, dateFrom, dateTo}, ...]
const defaultRange = getThisMonthRange(); // { dateFrom: "2026-07-01", dateTo: "2026-07-05" }

// Render presets as <a> links (not buttons):
{presets.map((p) => {
  const isActive = dateFrom === p.dateFrom && dateTo === p.dateTo;
  return (
    <a
      key={p.label}
      href={`/reports/financial?dateFrom=${p.dateFrom}&dateTo=${p.dateTo}`}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        isActive ? "bg-blue-600 text-white shadow" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {p.label}
    </a>
  );
})}
```

---

### Pattern 5: Server pages fetching data

Pages under `app/` are Server Components by default. They call query functions directly — no API routes, no useEffect, no fetch.

```jsx
// app/something/page.jsx
import { DashboardShell } from "@/components/ui/DashboardShell";
import { getSomething } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Sayfa Başlığı — Oto Servis CRM" };

export default async function SomethingPage({ searchParams }) {
  const sp = await searchParams;
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
        <h1 className="text-2xl font-bold text-slate-900">Başlık</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* content */}
      </main>
    </DashboardShell>
  );
}
```

---

### Pattern 6: Client components for interactivity

Add `"use client"` ONLY when you need useState, useEffect, event handlers, or browser APIs. The file cannot call Supabase (server-only). Name client components with a `Client` suffix: `StaffLoansClient.jsx`.

```jsx
// app/staff-loans/StaffLoansClient.jsx
"use client";

import { useState } from "react";
import { addStaffLoan } from "@/lib/actions";

export default function StaffLoansClient({ staff }) {
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    const result = await addStaffLoan(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={handleSubmit}>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {/* fields */}
    </form>
  );
}
```

---

### Pattern 7: Standard UI components

Use these exact Tailwind patterns — they match what's already in the codebase.

**Summary card:**
```jsx
<div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
  <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Etiket</p>
  <p className="mt-3 text-3xl font-extrabold text-blue-800">{value}</p>
  <p className="mt-1 text-xs text-blue-400">Alt başlık</p>
</div>
```

**Section with header:**
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
  <p className="mt-1 text-sm text-slate-400">Açıklama</p>
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

### Pattern 8: Reports system structure

The reports system has 4 pages. Each has a specific role — do not mix them up.

| Page | Role | Default date |
|---|---|---|
| `/reports` | Hub — shows today's live stats, no date filter | Always "today" |
| `/reports/financial` | Financial analysis — requires date range | No default (show prompt) |
| `/reports/operations` | Active cars always shown; completed filtered by date | No default |
| `/reports/staff` | Salary advances vs performance | Defaults to this month |

For hub stats, always use `getHubStats()` from `lib/reportQueries.js`.
For sub-reports, always import `getDatePresets` and render preset buttons above the manual date form.

---

## How to Add a New Feature

Follow this order every time. Do not skip steps.

### Step 1 — Does it need a DB change?

If yes → create a migration first:
```bash
make migration name=describe_the_change
# write SQL in the created file
make deploy
make status  # confirm Applied
```

Then update `supabase/schema.sql` to reflect the change.

Migration SQL rules:
- Always `IF NOT EXISTS` for CREATE TABLE / ADD COLUMN
- Always `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Never modify existing migration files

### Step 2 — Add read queries (if needed)

Add to `lib/queries.js` or `lib/reportQueries.js`:
- For simple CRUD reads → `lib/queries.js`
- For aggregated report data → `lib/reportQueries.js`

### Step 3 — Add write actions (if needed)

Add to `lib/actions.js`:
- Parse and validate first
- Then DB write
- Then `revalidatePath()` for all affected pages
- Then `redirect()` or `return { success: true }`

### Step 4 — Build the UI

- Server component if it just displays data
- Add `"use client"` only if it needs interactivity
- All labels and messages in Turkish
- Tailwind classes only — no inline `style={{}}`
- Use `@/` imports always

### Step 5 — Test it locally

```bash
npm run dev
# open http://localhost:3000
```

Check: happy path works, empty state looks right, error state shows correctly, page refreshes after save.

### Step 6 — Deploy

No DB change needed:
```bash
git add . && git commit -m "feat: describe what you added"
git push origin main
# Vercel auto-deploys
```

DB change needed (ALWAYS do DB first):
```bash
make deploy           # DB first
git push origin main  # frontend second
```

---

## How to Fix a Bug

| Symptom | Look here first |
|---|---|
| Page shows wrong or missing data | `lib/queries.js` — check the SELECT and filters |
| Form saves but screen doesn't update | `lib/actions.js` — is `revalidatePath()` called for this page? |
| Form submit returns an error | `lib/actions.js` — check validation and Supabase error message |
| "column does not exist" crash | DB column missing — write a migration |
| Auth redirect loop | `middleware.js` or `.env.local` (wrong Supabase URL/key) |
| Duplicate rows in query results | Missing `dedupeById()` — you used `!inner` join without deduplication |
| Client component can't access DB | You called Supabase inside a `"use client"` file — move DB call to server |
| Page data is stale after action | `revalidatePath()` is missing or pointing to wrong path |

---

## What You Must NEVER Do

These will break the app or create security issues:

- **Never commit `.env.local`** — it has secrets
- **Never change the database through the Supabase console** — use migrations
- **Never modify existing migration files** — only add new ones
- **Never put database logic inside page files** — use `lib/queries.js` or `lib/actions.js`
- **Never use `SUPABASE_SERVICE_ROLE_KEY` in client-side code** — it bypasses all security
- **Never add `"use client"` to a file that calls Supabase** — server client only works server-side
- **Never use TypeScript** — this is a JavaScript-only project (`.js` and `.jsx` only)
- **Never use inline `style={{}}`** — Tailwind classes only
- **Never use relative imports like `../../lib/something`** — always use `@/lib/something`
- **Never push to `main` without testing locally**
- **Never deploy frontend before DB migration** — the app will crash

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://hgrgcppgdtqlgpxlwyug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9O7wY1EiQDYtRHT2Th-ReA_9wiT3i5v
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

These go in `.env.local` (local) and in the Vercel dashboard (production).
For Vercel: Project Settings → Environment Variables.

---

## Makefile Reference

```bash
make link                        # First-time: link Supabase CLI to live project
make migration name=<name>       # Create a new migration file
make deploy                      # Push pending migrations to live DB
make status                      # Show applied vs pending migrations
make diff                        # Preview SQL that would be pushed
```

---

## Quick Cheat Sheet

```bash
# Run locally
npm run dev

# New DB migration
make migration name=add_column_x
# Edit the SQL file, then:
make deploy

# Full deploy (no DB change)
git add . && git commit -m "feat: ..." && git push origin main

# Full deploy (with DB change)
make deploy && git push origin main
```

**Import pattern:**
```javascript
import { createClient } from "@/lib/supabase";      // DB client
import { formatCurrency, formatDate } from "@/lib/format";  // formatting
import { getDatePresets } from "@/lib/datePresets";  // report date ranges
import { PAYMENT_METHOD_LABELS, SERVICE_TYPE_LABELS } from "@/config/constants";
import { DashboardShell } from "@/components/ui/DashboardShell";
```

**Service types** (from `config/constants.js`):
`painting`, `bodywork`, `pdr`, `detailing`, `polishing`, `ceramic`, `ppf`, `mechanical`

**Payment methods** (from `config/constants.js`):
`cash`, `havale`, `kredi_karti`, `cek`

---

## How to Give Good Instructions to an AI on This Project

**Bad prompt:**
> Add a discount feature

**Good prompt:**
> Add a `discount` column (NUMERIC, default 0) to the `visits` table.
> Show it in the create/edit visit form as "İndirim" field.
> Subtract it from `total_amount` display on the visit detail page.
> Include it in the financial report's summary calculations.
> Follow CLAUDE.md/GEMINI.md workflow: migration first, then queries, then actions, then UI.

Template for features:
```
I want to add [feature name].

It should work like this:
- [describe step by step what happens]

DB changes needed:
- [new column/table, or "none"]

Files likely involved:
- [list the files]

Follow the GEMINI.md workflow. Start with the migration if needed.
```

Template for bugs:
```
Bug on [page name]:

What happens: [describe]
What should happen: [describe]
Steps to reproduce:
1. [step]
2. [step]

Probably in [file] around line [number].
```
