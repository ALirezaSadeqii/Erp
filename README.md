# CRM — Car Service Management System

A Next.js CRM application for managing car service visits, staff loans, and reports, powered by [Supabase](https://supabase.com).

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/crm.git
cd crm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your own values:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Supabase project credentials:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

> ⚠️ **Never commit `.env.local` or any file containing real credentials to version control.**

You can find these values in your [Supabase Dashboard](https://app.supabase.com) under **Project Settings → API**.

### 4. Set up the database

Run the SQL schema against your Supabase project:

```bash
# In Supabase Dashboard → SQL Editor, paste and run the contents of:
supabase/schema.sql
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Backend / Auth / DB**: [Supabase](https://supabase.com)
- **Styling**: CSS

---

## Project Structure

```
app/          # Next.js App Router pages
components/   # Reusable UI components
config/       # App-wide constants
lib/          # Utility libraries (Supabase client helpers)
supabase/     # Database schema SQL
public/       # Static assets
```

---

## Security

- All secrets are stored in `.env.local` which is **git-ignored**
- `.env.example` documents required variables with placeholder values — safe to commit
- Row Level Security (RLS) should be enabled on all Supabase tables
