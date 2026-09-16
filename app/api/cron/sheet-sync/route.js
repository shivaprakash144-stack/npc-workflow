// Daily Google Sheet sync — runs once a day via Vercel Cron (see vercel.json)
// instead of on every job/enquiry save. This is the main lever for keeping
// Neon's "Network transfer" usage low: the sync pulls every column of every
// job/enquiry (needed to keep the sheet an exact mirror), so running it once
// a day instead of on every save cuts that transfer dramatically as the
// number of jobs/enquiries grows.
//
// Protected by CRON_SECRET so only Vercel's scheduler (or someone who knows
// the secret) can trigger it — add CRON_SECRET as an env var in Vercel and
// it's automatically sent as a Bearer token by Vercel Cron.
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { syncJobsToSheet, syncEnquiriesToSheet, sheetConfigured } from "@/lib/gsheet";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }
  }

  if (!sheetConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Google Sheet sync not configured" });
  }

  try {
    await ensureSchema();
    const q = sql();
    await syncJobsToSheet(q);
    await syncEnquiriesToSheet(q);
    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
