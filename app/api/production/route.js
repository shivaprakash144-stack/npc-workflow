// Production team endpoint: production-relevant details only.
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import { deriveOrderStatus } from "@/lib/derive";
import { entry, parseHistory } from "@/lib/history";
import { sendOrderReadyWhatsApp, waConfigured } from "@/lib/whatsapp";
import { syncJobsToSheet } from "@/lib/gsheet";

export const dynamic = "force-dynamic";

// production1 / production2 / production3 / outsource logins see only their unit's jobs
function unitForUser(s) {
  if (s.role !== "production") return null;
  const m = String(s.user || "").match(/^production\s*([123])$/);
  if (m) return `Production ${m[1]}`;
  if (String(s.user || "") === "outsource") return "Outsource";
  return null;
}

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    // Only jobs that have reached the production stage (design done).
    // Completed jobs are included so the page can show a "Completed" list; the client filters.
    let jobs = await q`SELECT job_id, customer_name, mobile, product_category, quantity, order_date, delivery_date, priority, order_status, design_status, machine_type, work_type, production_status, production_unit, production_complete, notes, created_at, updated_at
      FROM jobs
      WHERE order_status NOT IN ('Cancelled', 'Design Pending', 'Design Approval')
      ORDER BY created_at DESC`;
    const unit = unitForUser(s);
    if (unit) jobs = jobs.filter((j) => (j.production_unit || "") === unit);
    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function PATCH(req) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const b = await req.json();
    if (!b.job_id) return NextResponse.json({ error: "job_id is required" }, { status: 400 });
    const q = sql();
    const rows = await q`SELECT * FROM jobs WHERE job_id=${b.job_id}`;
    if (!rows.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const j = rows[0];

    const merged = {
      ...j,
      machine_type: b.machine_type ?? j.machine_type,
      work_type: b.work_type ?? j.work_type,
      production_status: b.production_status ?? j.production_status,
      production_unit: b.production_unit ?? j.production_unit,
    };
    const complete = typeof b.complete === "boolean" ? b.complete : !!j.production_complete;
    const orderStatus = j.order_status === "Cancelled" ? "Cancelled" : deriveOrderStatus(merged);

    const history = parseHistory(j.history);
    const track = [["machine_type", "Machine type"], ["work_type", "Work type"], ["production_status", "Production status"], ["production_unit", "Production unit"]];
    for (const [k, label] of track) {
      if (String(j[k] || "") !== String(merged[k] || "")) history.push(entry(s.user, `${label}: ${j[k] || "—"} → ${merged[k] || "—"}`));
    }
    if (String(j.order_status) !== orderStatus) history.push(entry(s.user, `Job status: ${j.order_status} → ${orderStatus}`));
    if (complete && !j.production_complete) history.push(entry(s.user, "Marked complete (removed from production)"));

    // Auto WhatsApp when the job just became Ready
    if (orderStatus === "Ready" && j.order_status !== "Ready" && waConfigured()) {
      const wa = await sendOrderReadyWhatsApp({
        mobile: j.mobile, customerName: j.customer_name, jobId: j.job_id, product: j.product_category,
      });
      history.push(entry("system", wa.ok
        ? `WhatsApp sent automatically to +91 ${String(j.mobile || "").trim()} (order ready)`
        : `WhatsApp auto-send failed: ${wa.detail || "unknown"} — use the manual button`));
    }

    await q`UPDATE jobs SET machine_type=${merged.machine_type}, work_type=${merged.work_type}, production_status=${merged.production_status}, production_unit=${merged.production_unit || ""}, order_status=${orderStatus}, production_complete=${complete}, history=${JSON.stringify(history)}, updated_at=now() WHERE job_id=${b.job_id}`;
    await syncJobsToSheet(q);
    return NextResponse.json({ ok: true, order_status: orderStatus, complete });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
