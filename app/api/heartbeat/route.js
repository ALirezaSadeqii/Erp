import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ── Heartbeat endpoint ─────────────────────────────────────────────────────
// GET /api/heartbeat?token=<HEARTBEAT_SECRET>
//
// Purpose: keeps the Supabase Free project active by updating a singleton
// row every time it is called.  Called by the heartbeat.yml GitHub Action
// every 3 days; completely independent of the backup workflow.
//
// Auth: simple shared-secret query parameter (no cookie / session needed).
// Uses the Service Role key so it bypasses Row-Level Security.
// ──────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function GET(request) {
  // ── 1. Validate secret ─────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const expected = process.env.HEARTBEAT_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfiguration: HEARTBEAT_SECRET is not set." },
      { status: 500 }
    );
  }

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Build a Service-Role Supabase client (bypasses RLS) ────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Server misconfiguration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.",
      },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── 3. Touch the singleton heartbeat row ──────────────────────────────
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("heartbeat")
    .update({ last_ping: now })
    .eq("id", 1);

  if (error) {
    console.error("[heartbeat] Supabase update failed:", error.message);
    return NextResponse.json(
      { error: `Database update failed: ${error.message}` },
      { status: 500 }
    );
  }

  // ── 4. Return success ─────────────────────────────────────────────────
  return NextResponse.json({ status: "ok", pinged_at: now }, { status: 200 });
}
