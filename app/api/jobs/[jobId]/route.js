import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import { deriveOrderStatus, derivePayment, isValidMobile } from "@/lib/derive";

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

    // Automatic statuses
    const payment = derivePayment(b.price, b.advance);
    const orderStatus = b.cancelled ? "Cancelled" : deriveOrderStatus(b);

    const q = sql();
    await q`UPDATE jobs SET
      customer_name=${b.customer_name.trim()}, mobile=${String(b.mobile).trim()},
      product_category=${b.product_category || ""}, quantity=${b.quantity || ""},
      price=${b.price || ""}, advance=${b.advance || ""}, payment_status=${payment},
      delivery_date=${b.delivery_date || null}, priority=${b.priority || "Normal"},
      order_status=${orderStatus},
      designer_name=${b.designer_name || ""}, design_status=${b.design_status || ""},
      machine_type=${b.machine_type || ""}, work_type=${b.work_type || ""}, production_status=${b.production_status || ""},
      delivery_status=${b.delivery_status || ""},
      notes=${b.notes || ""}
      WHERE job_id=${params.jobId}`;
    return NextResponse.json({ ok: true, order_status: orderStatus, payment_status: payment });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
