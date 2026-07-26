import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema, nextJobId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    const jobs = await q`SELECT job_id, enquiry_id, customer_id, customer_name, mobile, product_category, quantity, price, advance, payment_status, order_date, delivery_date, priority, order_status, design_status, production_status, delivery_status, work_type, created_at FROM jobs ORDER BY created_at DESC`;
    return NextResponse.json({ jobs, syncedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function POST(req) {
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const b = await req.json();
    if (!String(b.customer_name || "").trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    const q = sql();
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = await nextJobId(q);
      try {
        await q`INSERT INTO jobs (job_id, enquiry_id, customer_id, customer_name, mobile, product_category, quantity, price, advance, payment_status, delivery_date, priority, order_status, work_type, notes)
          VALUES (${id}, ${b.enquiry_id || ""}, ${b.customer_id || ""}, ${b.customer_name.trim()}, ${b.mobile || ""}, ${b.product_category || ""}, ${b.quantity || ""}, ${b.price || ""}, ${b.advance || ""}, ${b.payment_status || "No"}, ${b.delivery_date || null}, ${b.priority || "Normal"}, ${b.order_status || "Design Pending"}, ${b.work_type || ""}, ${b.notes || ""})`;
        if (b.enquiry_id) {
          await q`UPDATE enquiries SET status='Confirmed' WHERE enquiry_id=${b.enquiry_id}`;
        }
        return NextResponse.json({ ok: true, job_id: id });
      } catch (err) {
        if (!String(err.message).includes("duplicate")) throw err;
      }
    }
    return NextResponse.json({ error: "Could not allocate a Job ID. Try again" }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
