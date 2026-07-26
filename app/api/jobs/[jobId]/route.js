import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
const MAX_FILE = 2 * 1024 * 1024 * 1.4;

export async function GET(_req, { params }) {
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const b = await req.json();
    if ((b.design_file || "").length > MAX_FILE) return NextResponse.json({ error: "Design file must be under 2 MB" }, { status: 400 });
    const q = sql();
    await q`UPDATE jobs SET
      customer_name=${b.customer_name || ""}, mobile=${b.mobile || ""},
      product_category=${b.product_category || ""}, quantity=${b.quantity || ""},
      price=${b.price || ""}, advance=${b.advance || ""}, payment_status=${b.payment_status || "No"},
      delivery_date=${b.delivery_date || null}, priority=${b.priority || "Normal"},
      order_status=${b.order_status || "Design Pending"},
      designer_name=${b.designer_name || ""}, design_file=${b.design_file || ""}, design_status=${b.design_status || ""},
      machine_type=${b.machine_type || ""}, work_type=${b.work_type || ""}, production_status=${b.production_status || ""},
      delivery_method=${b.delivery_method || ""}, courier_name=${b.courier_name || ""}, tracking_number=${b.tracking_number || ""}, delivery_status=${b.delivery_status || ""},
      notes=${b.notes || ""}
      WHERE job_id=${params.jobId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
