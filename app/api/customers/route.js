import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema, nextCustomerId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const q = sql();
    const customers = await q`SELECT * FROM customers ORDER BY created_at DESC`;
    return NextResponse.json({ customers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function POST(req) {
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const b = await req.json();
    if (!String(b.name || "").trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    const q = sql();
    const id = await nextCustomerId(q);
    await q`INSERT INTO customers (customer_id, name, mobile, company, address, gst)
      VALUES (${id}, ${b.name.trim()}, ${b.mobile || ""}, ${b.company || ""}, ${b.address || ""}, ${b.gst || ""})`;
    return NextResponse.json({ ok: true, customer_id: id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function PUT(req) {
  if (!(await requireSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await ensureSchema();
    const b = await req.json();
    const q = sql();
    await q`UPDATE customers SET name=${b.name || ""}, mobile=${b.mobile || ""}, company=${b.company || ""}, address=${b.address || ""}, gst=${b.gst || ""} WHERE customer_id=${b.customer_id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
