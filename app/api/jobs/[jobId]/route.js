import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import { deriveOrderStatus, isValidMobile } from "@/lib/derive";
import { entry, parseHistory, jobChanges } from "@/lib/history";
import { sendOrderReadyWhatsApp, waConfigured } from "@/lib/whatsapp";
import { syncJobsToSheet } from "@/lib/gsheet";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (s.role === "production") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  try {
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT * FROM jobs WHERE job_id=${params.jobId}`;
    if (!rows.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ job: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function PATCH(req, { params }) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (s.role === "production") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  try {
    await ensureSchema();
    const b = await req.json();
    if (!String(b.customer_name || "").trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    if (!isValidMobile(b.mobile)) return NextResponse.json({ error: "Mobile number must be exactly 10 digits" }, { status: 400 });

    const q = sql();
    const rows = await q`SELECT * FROM jobs WHERE job_id=${params.jobId}`;
    if (!rows.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const oldJ = rows[0];

    // Cancel / reactivate: owner and manager only
    const wasCancelled = oldJ.order_status === "Cancelled";
    const wantCancelled = !!b.cancelled;
    if (wantCancelled !== wasCancelled && !["owner", "manager"].includes(s.role)) {
      return NextResponse.json({ error: "Only the owner or manager can cancel or reactivate a job" }, { status: 403 });
    }

    const payment = b.payment_status === "Yes" ? "Yes" : "No";
    const orderStatus = wantCancelled ? "Cancelled" : deriveOrderStatus(b);
    const reviewDone = typeof b.review_done === "boolean" ? b.review_done : !!oldJ.review_done;
    const prodComplete = typeof b.production_complete === "boolean" ? b.production_complete : !!oldJ.production_complete;

    const history = parseHistory(oldJ.history);
    const changes = jobChanges(oldJ, { ...b, payment_status: payment }, orderStatus);
    for (const c of changes) history.push(entry(s.user, c));
    if (b.cancelled && oldJ.order_status !== "Cancelled") history.push(entry(s.user, "Job cancelled"));
    if (!b.cancelled && oldJ.order_status === "Cancelled") history.push(entry(s.user, "Job reactivated"));
    if (prodComplete !== !!oldJ.production_complete) {
      history.push(entry(s.user, prodComplete ? "Marked complete (removed from production)" : "Reopened in production"));
    }
    if (reviewDone !== !!oldJ.review_done) {
      history.push(entry(s.user, reviewDone ? "Google review completed ✓" : "Google review unmarked"));
    }

    // Auto WhatsApp when the job just became Ready
    if (orderStatus === "Ready" && oldJ.order_status !== "Ready" && waConfigured()) {
      const wa = await sendOrderReadyWhatsApp({
        mobile: b.mobile, customerName: b.customer_name, jobId: params.jobId, product: b.product_category,
      });
      history.push(entry("system", wa.ok
        ? `WhatsApp sent automatically to +91 ${String(b.mobile).trim()} (order ready)`
        : `WhatsApp auto-send failed: ${wa.detail || "unknown"} — use the manual button`));
    }

    await q`UPDATE jobs SET
      customer_name=${b.customer_name.trim()}, mobile=${String(b.mobile).trim()},
      product_category=${String(b.product_category || "").trim()}, quantity=${b.quantity || ""},
      payment_status=${payment},
      delivery_date=${b.delivery_date || null}, priority=${b.priority || "Normal"},
      order_status=${orderStatus},
      designer_name=${b.designer_name || ""}, design_status=${b.design_status || ""},
      machine_type=${b.machine_type || ""}, work_type=${b.work_type || ""}, production_status=${b.production_status || ""},
      delivery_status=${b.delivery_status || ""},
      production_complete=${prodComplete},
      review_done=${reviewDone},
      notes=${b.notes || ""},
      history=${JSON.stringify(history)},
      updated_at=now()
      WHERE job_id=${params.jobId}`;
    await syncJobsToSheet(q);
    return NextResponse.json({ ok: true, order_status: orderStatus, payment_status: payment, history });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
