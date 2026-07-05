# Developer Guide — Auto Repair Shop CRM

This file is the single source of truth for how to work on this project.
**Read it fully before writing any code.** If you are an AI assistant (Google Antigravity / Gemini),
treat every rule here as a strict constraint unless the developer explicitly overrides it.

---

## What This App Does

This is a CRM (Customer Relationship Management) system for an auto repair /
bodywork shop. It manages:

- **Customers** and their vehicles
- **Workshop visits** — entry/exit dates, services performed, costs
- **Staff** and their salary advances (loans)
- **Financial reports** — income, expenses, payment methods, staff performance

The app is used internally by shop staff. All users must be logged in.
There is no public-facing content.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.9 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Database | Supabase (PostgreSQL 15) | — |
| Auth | Supabase Auth — email only | — |
| DB client | @supabase/ssr + @supabase/supabase-js | 0.12 / 2.108 |
| Frontend hosting | Vercel | — |
| Language | JavaScript — no TypeScript | — |

---

## File Structure — Every File Explained

```
Erp/
│
├── app/                          Next.js App Router pages
│   ├── layout.jsx               Root layout — wraps every page
│   ├── page.jsx                 Homepage — redirects to /dashboard
│   ├── globals.css              Global CSS / Tailwind imports
│   ├── favicon.ico
│   │
│   ├── login/                   Login page (public, no auth required)
│   │
│   ├── dashboard/               Main dashboard — list of all visits
│   │
│   ├── visits/
│   │   ├── new/                 Create a new visit form
│   │   └── [id]/                View a single visit
│   │       └── edit/            Edit an existing visit
│   │
│   ├── cars/
│   │   └── [id]/                View a car and its full visit history
│   │
│   ├── staff-loans/             Staff salary advances management
│   │
│   └── reports/                 Financial reports and summaries
│
├── components/                  Reusable React components shared across pages
│
├── lib/                         All business logic — NO UI here
│   ├── supabase.js              Creates the Supabase server client (uses cookies)
│   ├── supabase/
│   │   └── middleware.js        Refreshes auth session on every request
│   ├── queries.js               All READ operations (SELECT queries)
│   ├── actions.js               All WRITE operations (INSERT/UPDATE/DELETE)
│   │                            These are Next.js Server Actions ("use server")
│   ├── reportQueries.js         Aggregation queries for the reports page
│   ├── auth.js                  Login / logout helpers
│   └── format.js                Date, currency, text formatting utilities
│
├── supabase/
│   ├── config.toml              Supabase project config (region, auth, etc.)
│   ├── schema.sql               REFERENCE ONLY — human-readable full schema
│   │                            Always keep this in sync with migrations/
│   └── migrations/              The real source of truth for DB changes
│       └── 20260705000000_baseline.sql   Full schema as of project start
│
├── middleware.js                 Next.js middleware — protects all routes
│                                 Redirects unauthenticated users to /login
├── Makefile                      Database deployment commands (see below)
├── .env.local                    Local secrets — NEVER commit this file
├── .env.example                  Template showing which env vars are needed
├── next.config.mjs               Next.js configuration
├── package.json                  Dependencies
└── jsconfig.json                 Path alias — @/ maps to project root
```

---

## First-Time Setup

### 1. Prerequisites

Install these before anything else:

```bash
node --version      # must be 18 or higher
npm --version       # comes with Node
supabase --version  # Supabase CLI — install from https://supabase.com/docs/guides/cli
```

Install Supabase CLI (macOS):
```bash
brew install supabase/tap/supabase
```

### 2. Clone and install

```bash
git clone <repo-url>
cd Erp
npm install
```

### 3. Create your local environment file

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values:
```
NEXT_PUBLIC_SUPABASE_URL=https://hgrgcppgdtqlgpxlwyug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9O7wY1EiQDYtRHT2Th-ReA_9wiT3i5v
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

These values never change — the project uses one Supabase project for everything.

### 4. Link the Supabase CLI to the project

Do this once. It lets the Makefile talk to the live database.

```bash
supabase login      # opens browser — log in with your Supabase account
make link           # links this repo to project hgrgcppgdtqlgpxlwyug
```

### 5. Run the app locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser. Log in with your credentials.

---

## Daily Development Workflow

```
1. Pull latest code        git pull origin main
2. Make your changes       (see sections below)
3. Test locally            npm run dev
4. If DB changed           make migration name=describe_the_change
                           (write the SQL, then: make deploy)
5. Commit                  git add . && git commit -m "what you did"
6. Push                    git push origin main
7. Deploy frontend         Vercel auto-deploys on push to main (see Deployment)
```

---

## How to Add a New Feature

Follow these steps in order. Do not skip steps.

### Step 1 — Understand what needs to change

Before writing a single line of code, answer these questions:
- Does this feature need a new database table or column?
- Which pages does it affect?
- Does it need new read queries, write actions, or both?

### Step 2 — Database changes (if needed)

If the feature needs a new table or column, create a migration first.

```bash
make migration name=add_payment_installments
```

This creates a timestamped file in `supabase/migrations/`. Open that file and
write the SQL:

```sql
-- Example: adding a new column to visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
```

```sql
-- Example: creating a new table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Then deploy:
```bash
make deploy     # pushes the migration to the live database
make status     # confirm it shows as Applied
```

Also update `supabase/schema.sql` to include the change, so it stays as an
accurate reference for the whole schema.

### Step 3 — Add read queries (if needed)

All read queries live in `lib/queries.js`. Add a new exported `async function`.

Pattern to follow:
```javascript
export async function getInvoices(visitId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("id, visit_id, amount, issued_at, created_at")
    .eq("visit_id", visitId)
    .order("issued_at", { ascending: false });

  if (error) {
    return { invoices: [], error: error.message };
  }

  return { invoices: data ?? [], error: null };
}
```

Rules for queries:
- Always `await createClient()` at the top
- Always handle the error — return `{ data: [], error: error.message }` pattern
- Never put UI logic here — only database calls and light data shaping

### Step 4 — Add write actions (if needed)

All write operations live in `lib/actions.js`. The file starts with `"use server"`.

Pattern to follow:
```javascript
export async function createInvoice(formData) {
  const visitId = formData.get("visitId")?.toString();
  const amount = parseFloat(formData.get("amount") || "0");

  if (!visitId) return { error: "Visit ID required." };
  if (!amount || amount <= 0) return { error: "Enter a valid amount." };

  const supabase = await createClient();

  const { error } = await supabase.from("invoices").insert({
    visit_id: visitId,
    amount,
  });

  if (error) {
    return { error: `Could not create invoice: ${error.message}` };
  }

  revalidatePath(`/visits/${visitId}`);
  return { success: true };
}
```

Rules for actions:
- Must be in a file that starts with `"use server"`
- Validate all inputs before touching the database
- Call `revalidatePath(...)` after writes so Next.js refreshes the page data
- Return `{ error: "..." }` on failure, `{ success: true }` on success
- Use `redirect(...)` when the user should be sent to a different page after success

### Step 5 — Build the UI

Pages live in `app/`. Shared components live in `components/`.

- `page.jsx` files are **Server Components** by default — they can call queries directly
- Add `"use client"` at the top only when you need interactivity (forms, state, effects)
- Use Tailwind classes for all styling — no inline styles, no CSS files (except globals.css)

Example server page that fetches and displays data:
```jsx
import { getInvoices } from "@/lib/queries";

export default async function InvoicesPage({ params }) {
  const { invoices, error } = await getInvoices(params.id);

  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      {invoices.map((inv) => (
        <div key={inv.id}>{inv.amount}</div>
      ))}
    </div>
  );
}
```

### Step 6 — Test everything

```bash
npm run dev
```

Go through the feature manually:
- Does the happy path work (normal use)?
- What happens if required fields are empty?
- What if there is no data to display?
- Does the page refresh correctly after a save?

### Step 7 — Deploy

```bash
git add .
git commit -m "feat: add invoice feature"
git push origin main
```

Vercel automatically deploys the frontend on push. If you ran `make deploy`
earlier, the database is already updated.

---

## How to Fix a Bug

### Step 1 — Reproduce it first

Before changing anything, make sure you can reliably reproduce the bug locally.
If you cannot reproduce it, you cannot verify the fix.

### Step 2 — Find where the bug is

Use this checklist to narrow it down:

| Symptom | Likely location |
|---|---|
| Page shows wrong data | `lib/queries.js` — check the query and filters |
| Form saves but nothing changes | `lib/actions.js` — check `revalidatePath` is called |
| Form submit gives an error | `lib/actions.js` — check validation and Supabase error |
| Page crashes with "column does not exist" | Column missing from DB — needs a migration |
| Auth redirect loops | `middleware.js` or `lib/auth.js` |
| Styling looks wrong | The component's Tailwind classes |
| Data shows on server but not client | Missing `"use client"` or state management issue |

### Step 3 — Fix it in the right file

- Bug in how data is read → fix in `lib/queries.js`
- Bug in how data is written → fix in `lib/actions.js`
- Bug in what the user sees → fix in `app/` or `components/`
- Bug caused by missing DB column → write a migration

### Step 4 — Verify the fix

Run `npm run dev` and confirm:
1. The bug no longer happens
2. Nothing else broke (check the pages that use the same code)

### Step 5 — Commit and deploy

```bash
git add .
git commit -m "fix: describe what was broken and how it is now fixed"
git push origin main
```

---

## Database Workflow — The Rules

**The golden rule: never change the database through the Supabase console.**
All database changes must go through migration files and `make deploy`.
This ensures the database state is always reproducible from code.

### The migration workflow

```bash
# 1. Create a new migration file (always do this first)
make migration name=what_you_are_changing

# 2. Write the SQL in the generated file
#    File is in supabase/migrations/ with a timestamp prefix

# 3. Preview what will be pushed (optional sanity check)
make diff

# 4. Apply the migration to the live database
make deploy

# 5. Confirm it was applied
make status
```

### Migration file rules

- One logical change per migration file
- Always use `IF NOT EXISTS` for CREATE TABLE and CREATE INDEX
- Always use `IF NOT EXISTS` for ADD COLUMN: `ALTER TABLE t ADD COLUMN IF NOT EXISTS ...`
- Always use `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Never delete or modify existing migration files — only add new ones
- Name migrations clearly: `add_discount_to_visits`, `create_invoices_table`, `fix_visits_rls`

### After every DB change

Update `supabase/schema.sql` to reflect the new state. This file is the
human-readable reference for the whole schema and must stay accurate.

### Makefile reference

| Command | What it does |
|---|---|
| `make link` | First-time setup: link CLI to the live project |
| `make migration name=<name>` | Create a new empty migration file |
| `make deploy` | Push all pending migrations to the live database |
| `make status` | Show which migrations are applied vs pending |
| `make diff` | Preview what SQL would be pushed (does not apply) |
| `make pull` | Capture any console changes into a migration file |

---

## Database Schema Reference

Six tables in the `public` schema. All require authentication (RLS enabled).

### customers
```
id            UUID (PK)
name          TEXT NOT NULL
phone         TEXT NOT NULL (used as unique identifier for lookups)
company_name  TEXT
created_at    TIMESTAMP
```

### cars
```
id             UUID (PK)
customer_id    UUID → customers.id (CASCADE DELETE)
license_plate  TEXT UNIQUE NOT NULL
vehicle_type   TEXT
model          TEXT
color          TEXT
vin            TEXT
created_at     TIMESTAMP
```

### visits
```
id                       UUID (PK)
car_id                   UUID → cars.id (CASCADE DELETE)
entry_date               DATE NOT NULL
exit_date                DATE (null = vehicle still in shop)
requires_chassis_alignment  BOOLEAN DEFAULT false
painted_parts_count      INTEGER DEFAULT 0
bodywork_parts_count     INTEGER DEFAULT 0
total_amount             NUMERIC
payment_method           TEXT
insurance                TEXT (insurance company name, if applicable)
vehicle_expense          NUMERIC DEFAULT 0 (parts/materials cost)
notes                    TEXT
created_at               TIMESTAMP
```

### staff
```
id            UUID (PK)
name          TEXT NOT NULL
role          TEXT
fixed_salary  NUMERIC DEFAULT 0
created_at    TIMESTAMP
```

### staff_loans
```
id         UUID (PK)
staff_id   UUID NOT NULL → staff.id (CASCADE DELETE)
amount     NUMERIC NOT NULL
loan_date  DATE NOT NULL DEFAULT CURRENT_DATE
created_at TIMESTAMP
```

### services
```
id            UUID (PK)
visit_id      UUID → visits.id (CASCADE DELETE)
service_type  TEXT NOT NULL
staff_id      UUID → staff.id (SET NULL on delete)
price         NUMERIC
notes         TEXT
created_at    TIMESTAMP
```

---

## Deployment

### Frontend — Vercel

The frontend deploys automatically every time you push to `main`.

**Initial Vercel setup (one time):**
1. Go to vercel.com and import this Git repository
2. Framework preset: Next.js (Vercel detects this automatically)
3. Add these environment variables in the Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://hgrgcppgdtqlgpxlwyug.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_9O7wY1EiQDYtRHT2Th-ReA_9wiT3i5v
   SUPABASE_SERVICE_ROLE_KEY     = <your-service-role-key>
   ```
4. Click Deploy

**After initial setup**, every `git push origin main` triggers an automatic
Vercel deployment. No manual steps needed.

**Checking a deployment:**
- Go to vercel.com → your project → Deployments tab
- Red = failed (click it to see the build error log)
- Green = live

### Database — Supabase

The database is NOT automatically deployed. You must run `make deploy`
whenever a migration needs to be applied.

**Deployment order matters:**
```
1. make deploy          # database FIRST
2. git push origin main # frontend SECOND
```

Always do database first. If the frontend goes out before the DB is updated,
the app will crash because the code expects columns that do not exist yet.

---

## Supabase Auth

The app uses email/password authentication only. No social providers.

Users must be created manually in the Supabase dashboard:
Dashboard → Authentication → Users → Add user

The middleware in `middleware.js` protects all routes. Unauthenticated users
are redirected to `/login` automatically.

Auth is handled by `lib/auth.js` and the Supabase client in `lib/supabase.js`.
Do not bypass the auth middleware.

---

## Code Patterns and Conventions

These patterns are already established in the codebase. Follow them consistently.

### Pattern 1 — Server Component fetching data

```jsx
// app/something/page.jsx
import { getVisits } from "@/lib/queries";

export default async function Page() {
  const { visits, error } = await getVisits();
  if (error) return <p className="text-red-600">{error}</p>;
  return <div>{/* render visits */}</div>;
}
```

### Pattern 2 — Server Action form submission

```jsx
// In a Client Component
"use client";
import { createVisit } from "@/lib/actions";

export default function MyForm() {
  const [error, setError] = useState(null);

  async function handleSubmit(formData) {
    const result = await createVisit(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={handleSubmit}>
      {error && <p className="text-red-600">{error}</p>}
      {/* fields */}
    </form>
  );
}
```

### Pattern 3 — Supabase query in queries.js

```javascript
export async function getSomething(filters = {}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("table_name")
    .select("col1, col2, related_table(col1)")
    .eq("some_column", filters.value)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSomething error:", error.message);
    return { items: [], error: error.message };
  }

  return { items: data ?? [], error: null };
}
```

### Pattern 4 — Path aliases

Always use `@/` to import from the project root:
```javascript
import { createClient } from "@/lib/supabase";   // correct
import { createClient } from "../../lib/supabase"; // wrong
```

### Pattern 5 — Tailwind styling

Use Tailwind utility classes only. No inline `style={{}}`, no custom CSS files.
```jsx
<div className="flex items-center gap-4 p-6 bg-white rounded-xl shadow">
```

---

## What NOT to Do

- **Never commit `.env.local`** — it contains secrets. It is gitignored.
- **Never change the database in the Supabase console** — use migrations.
- **Never modify existing migration files** — only add new ones.
- **Never put database logic in page files** — it belongs in `lib/queries.js` or `lib/actions.js`.
- **Never use `SUPABASE_SERVICE_ROLE_KEY` in frontend (client-side) code** — it bypasses all security.
- **Never add `"use client"` to a file that does database calls** — Supabase server client only works server-side.
- **Never push to `main` without testing locally first**.

---

## Prompting the AI Correctly

When working with an AI coding assistant on this project, give it context. Vague
prompts produce bad results. Be specific.

**Bad prompt:**
> Add a discount feature

**Good prompt:**
> Add a discount field to the visits table and the create/edit visit form.
> The discount is a numeric value (euros). It should be shown in the visit detail
> page and subtracted from total_amount in the reports.
> Follow the migration workflow in GEMINI.md and the existing patterns in
> lib/actions.js and lib/queries.js.

**Template for new features:**
```
I want to add [feature name].

It should work like this:
- [describe the user experience step by step]

Database changes needed:
- [new table or column, or "none"]

Files likely involved:
- [list the files you think need to change]

Follow the GEMINI.md workflow. Start with the migration if DB changes are needed,
then queries, then actions, then the UI.
```

**Template for bug fixes:**
```
There is a bug on the [page name] page.

What happens:
- [describe exactly what goes wrong]

What should happen:
- [describe the correct behaviour]

Steps to reproduce:
1. [step 1]
2. [step 2]

The relevant code is probably in [file name] around line [number].
```

---

## Common Issues and Solutions

**Problem:** `supabase: command not found`
```bash
brew install supabase/tap/supabase
```

**Problem:** `make link` fails with "not logged in"
```bash
supabase login    # then try make link again
```

**Problem:** `make deploy` fails with "migration already applied"
The migration was already run. This is fine — check `make status` to confirm.

**Problem:** Page crashes with `column "X" does not exist`
A column the code expects is missing from the database. Create a migration:
```bash
make migration name=add_X_column
# write: ALTER TABLE table_name ADD COLUMN IF NOT EXISTS X type;
make deploy
```

**Problem:** Login works but all pages redirect back to /login
Check that `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` values.

**Problem:** Data appears locally but not after Vercel deployment
The Vercel environment variables are missing or wrong. Check the Vercel
dashboard → Project → Settings → Environment Variables.

**Problem:** Form submits but data does not update on screen
The relevant `revalidatePath(...)` call is missing from the action in
`lib/actions.js`. Add it after the successful database write.

**Problem:** `npm run dev` fails with module not found
```bash
npm install    # reinstall dependencies
```

---

## Quick Reference Cheat Sheet

```bash
# Start local dev
npm run dev

# New DB migration
make migration name=describe_the_change

# Deploy DB migrations
make deploy

# Check migration status
make status

# Full deploy (DB + frontend)
make deploy && git push origin main

# Install dependencies after git pull
npm install
```
