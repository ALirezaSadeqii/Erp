import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * GET /api/heartbeat?token=<HEARTBEAT_SECRET>
 *
 * Verifies the secret token, updates heartbeat.last_ping to NOW(),
 * and returns { status: "ok", pinged_at: "<ISO timestamp>" }.
 *
 * Uses the service-role key so it can bypass RLS — this route
 * is server-side only and the key is never exposed to the client.
 */
export async function GET(request) {
  // ── 1. Verify secret token ──────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || token !== process.env.HEARTBEAT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Create a service-role Supabase client (bypasses RLS) ────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // ── 3. Update last_ping on the singleton row ────────────────────
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("heartbeat")
    .update({ last_ping: now })
    .eq("id", 1);

  if (error) {
    console.error("Heartbeat update failed:", error.message);
    return NextResponse.json(
      { error: "Database update failed", details: error.message },
      { status: 500 }
    );
  }

  // ── 4. Return success ───────────────────────────────────────────
  return NextResponse.json({ status: "ok", pinged_at: now });
}
