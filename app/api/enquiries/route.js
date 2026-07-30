import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema, nextEnquiryId } from "@/lib/db";
import { isValidMobile } from "@/lib/derive";
import { entry, parseHistory } from "@/lib/history";

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

// Only customer name and mobile are mandatory.
function validate(b) {
  if (!String(b.customer_name || "").trim()) return "Customer name is required";
  if (!isValidMobile(b.mobile)) return "Mobile number must be exactly 10 digits";
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
    const history = JSON.stringify([entry(g.s.user, "Enquiry created")]);
    await q`INSERT INTO enquiries (enquiry_id, customer_id, customer_name, mobile, product_type, size_material, quantity, design_required, ref_image, est_price, status, designer_name, priority, enquiry_mode, history)
      VALUES (${id}, ${b.customer_id || ""}, ${b.customer_name.trim()}, ${String(b.mobile).trim()}, ${b.product_type || ""}, ${b.size_material || ""}, ${b.quantity || ""}, ${b.design_required || "No"}, ${b.ref_image || ""}, ${b.est_price || ""}, ${b.status || "New Enquiry"}, ${b.designer_name || ""}, ${b.priority || "Normal"}, ${b.enquiry_mode || ""}, ${history})`;
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
    const rows = await q`SELECT status, history FROM enquiries WHERE enquiry_id=${b.enquiry_id}`;
    const old = rows[0] || {};
    const history = parseHistory(old.history);
    if (String(old.status || "") !== String(b.status || "")) {
      history.push(entry(g.s.user, `Status: ${old.status || "—"} → ${b.status || "—"}`));
    } else {
      history.push(entry(g.s.user, "Enquiry updated"));
    }
    await q`UPDATE enquiries SET customer_name=${b.customer_name.trim()}, mobile=${String(b.mobile).trim()}, product_type=${b.product_type || ""}, size_material=${b.size_material || ""}, quantity=${b.quantity || ""}, design_required=${b.design_required || "No"}, ref_image=${b.ref_image || ""}, est_price=${b.est_price || ""}, status=${b.status || "New Enquiry"}, designer_name=${b.designer_name || ""}, priority=${b.priority || "Normal"}, enquiry_mode=${b.enquiry_mode || ""}, history=${JSON.stringify(history)}, updated_at=now() WHERE enquiry_id=${b.enquiry_id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
