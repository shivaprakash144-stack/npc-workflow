import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema, nextJobId } from "@/lib/db";
import { isValidMobile } from "@/lib/derive";
import { entry } from "@/lib/history";
import { syncJobsToSheet } from "@/lib/gsheet";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (s.role === "production") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  try {
    await ensureSchema();
    const q = sql();
    const jobs = await q`SELECT job_id, enquiry_id, customer_name, mobile, product_category, quantity, payment_status, order_date, delivery_date, priority, order_status, design_status, designer_name, machine_type, production_status, delivery_status, work_type, production_complete, review_done, notes, created_at, updated_at FROM jobs ORDER BY created_at DESC`;
    return NextResponse.json({ jobs, syncedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function POST(req) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (s.role === "production") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  try {
    await ensureSchema();
    const b = await req.json();
    if (!String(b.customer_name || "").trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    if (!isValidMobile(b.mobile)) return NextResponse.json({ error: "Mobile number must be exactly 10 digits" }, { status: 400 });
    if (!String(b.product_category || "").trim()) return NextResponse.json({ error: "Product category is required" }, { status: 400 });
    if (!String(b.quantity || "").trim()) return NextResponse.json({ error: "Quantity is required" }, { status: 400 });
    if (!String(b.delivery_date || "").trim()) return NextResponse.json({ error: "Delivery date is required" }, { status: 400 });

    const payment = b.payment_status === "Yes" ? "Yes" : "No";
    const history = JSON.stringify([entry(s.user, "Job created")]);
    const q = sql();
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = await nextJobId(q);
      try {
        await q`INSERT INTO jobs (job_id, enquiry_id, customer_name, mobile, product_category, quantity, payment_status, delivery_date, priority, order_status, work_type, notes, history, production_complete)
          VALUES (${id}, ${b.enquiry_id || ""}, ${b.customer_name.trim()}, ${String(b.mobile).trim()}, ${String(b.product_category).trim()}, ${b.quantity}, ${payment}, ${b.delivery_date}, ${b.priority || "Normal"}, 'Design Pending', ${b.work_type || ""}, ${b.notes || ""}, ${history}, false)`;
        if (b.enquiry_id) await q`UPDATE enquiries SET status='Confirmed' WHERE enquiry_id=${b.enquiry_id}`;
        await syncJobsToSheet(q);
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
