import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema, nextEnquiryId } from "@/lib/db";
import { isValidMobile } from "@/lib/derive";

export const dynamic = "force-dynamic";
const MAX_IMG = 2 * 1024 * 1024 * 1.4;

async function guard() {
  const s = await requireSession();
  if (!s) return { err: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (s.role === "production") return { err: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  return { s };
}

export async function GET() {
  const g = await guard();
  if (g.err) return g.err;
  try {
    await ensureSchema();
    const q = sql();
    const enquiries = await q`SELECT * FROM enquiries ORDER BY created_at DESC`;
    return NextResponse.json({ enquiries });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

function validate(b) {
  if (!String(b.customer_name || "").trim()) return "Customer name is required";
  if (!isValidMobile(b.mobile)) return "Mobile number must be exactly 10 digits";
  if (!String(b.product_type || "").trim()) return "Product type is required";
  if (!String(b.quantity || "").trim()) return "Quantity is required";
  if ((b.ref_image || "").length > MAX_IMG) return "Reference image must be under 2 MB";
  return null;
}

export async function POST(req) {
  const g = await guard();
  if (g.err) return g.err;
  try {
    await ensureSchema();
    const b = await req.json();
    const bad = validate(b);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const q = sql();
    const id = await nextEnquiryId(q);
    await q`INSERT INTO enquiries (enquiry_id, customer_id, customer_name, mobile, product_type, size_material, quantity, design_required, ref_image, est_price, status)
      VALUES (${id}, ${b.customer_id || ""}, ${b.customer_name.trim()}, ${String(b.mobile).trim()}, ${b.product_type}, ${b.size_material || ""}, ${b.quantity}, ${b.design_required || "No"}, ${b.ref_image || ""}, ${b.est_price || ""}, ${b.status || "New Enquiry"})`;
    return NextResponse.json({ ok: true, enquiry_id: id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function PUT(req) {
  const g = await guard();
  if (g.err) return g.err;
  try {
    await ensureSchema();
    const b = await req.json();
    const bad = validate(b);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const q = sql();
    await q`UPDATE enquiries SET customer_name=${b.customer_name.trim()}, mobile=${String(b.mobile).trim()}, product_type=${b.product_type}, size_material=${b.size_material || ""}, quantity=${b.quantity}, design_required=${b.design_required || "No"}, ref_image=${b.ref_image || ""}, est_price=${b.est_price || ""}, status=${b.status || "New Enquiry"} WHERE enquiry_id=${b.enquiry_id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
