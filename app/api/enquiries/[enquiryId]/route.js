import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import { isValidMobile } from "@/lib/derive";
import { entry, parseHistory, enquiryChanges } from "@/lib/history";
// Google Sheet sync now runs once a day via /api/cron/sheet-sync (see vercel.json)
// instead of on every save, to keep Neon network-transfer usage low.

export const dynamic = "force-dynamic";

async function guard() {
  const s = await requireSession();
  if (!s) return { err: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (s.role === "production") return { err: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  return { s };
}

export async function GET(_req, { params }) {
  const g = await guard();
  if (g.err) return g.err;
  try {
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT * FROM enquiries WHERE enquiry_id=${params.enquiryId}`;
    if (!rows.length) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    return NextResponse.json({ enquiry: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function PATCH(req, { params }) {
  const g = await guard();
  if (g.err) return g.err;
  try {
    await ensureSchema();
    const b = await req.json();
    if (!String(b.customer_name || "").trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    if (!isValidMobile(b.mobile)) return NextResponse.json({ error: "Mobile number must be exactly 10 digits" }, { status: 400 });

    const q = sql();
    const rows = await q`SELECT * FROM enquiries WHERE enquiry_id=${params.enquiryId}`;
    if (!rows.length) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    const oldE = rows[0];

    // Cancel / reactivate: owner and manager only (same rule as jobs)
    const wasCancelled = oldE.status === "Cancelled";
    const wantCancelled = !!b.cancelled;
    if (wantCancelled !== wasCancelled && !["owner", "manager"].includes(g.s.role)) {
      return NextResponse.json({ error: "Only the admin or manager can cancel or reactivate an enquiry" }, { status: 403 });
    }

    const status = wantCancelled ? "Cancelled" : (b.status || oldE.status || "New Enquiry");
    const cancelReason = wantCancelled ? String(b.cancel_reason || oldE.cancel_reason || "").trim() : "";

    const history = parseHistory(oldE.history);
    const changes = enquiryChanges(oldE, { ...b, status });
    for (const c of changes) history.push(entry(g.s.user, c));
    if (wantCancelled && !wasCancelled) history.push(entry(g.s.user, `Enquiry cancelled${cancelReason ? " — " + cancelReason : ""}`));
    if (!wantCancelled && wasCancelled) history.push(entry(g.s.user, "Enquiry reactivated"));

    await q`UPDATE enquiries SET
      customer_name=${b.customer_name.trim()}, mobile=${String(b.mobile).trim()},
      product_category=${b.product_category || ""}, product_type=${b.product_type || ""}, size_material=${b.size_material || ""}, quantity=${b.quantity || ""},
      design_required=${b.design_required || "No"},
      ref_image=${b.ref_image === "__KEEP__" ? (oldE.ref_image || "") : (b.ref_image || "")},
      est_price=${b.est_price || ""}, status=${status},
      designer_name=${b.designer_name || ""}, priority=${b.priority || "Normal"}, enquiry_mode=${b.enquiry_mode || ""},
      cancel_reason=${cancelReason},
      history=${JSON.stringify(history)}, updated_at=now()
      WHERE enquiry_id=${params.enquiryId}`;
    return NextResponse.json({ ok: true, status, history });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
