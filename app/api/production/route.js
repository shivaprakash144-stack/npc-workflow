// Production team endpoint: sees and updates ONLY production-relevant details.
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import { deriveOrderStatus } from "@/lib/derive";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    const jobs = await q`SELECT job_id, customer_name, product_category, quantity, delivery_date, priority, order_status, design_status, machine_type, work_type, production_status, notes, created_at
      FROM jobs WHERE order_status NOT IN ('Cancelled') ORDER BY created_at DESC`;
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
    };
    const orderStatus = j.order_status === "Cancelled" ? "Cancelled" : deriveOrderStatus(merged);
    await q`UPDATE jobs SET machine_type=${merged.machine_type}, work_type=${merged.work_type}, production_status=${merged.production_status}, order_status=${orderStatus} WHERE job_id=${b.job_id}`;
    return NextResponse.json({ ok: true, order_status: orderStatus });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
