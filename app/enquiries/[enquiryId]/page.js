"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { Field, Select, Text, FileUpload, MultiSelect, SelectWithOther } from "@/components/Field";
import { ENQUIRY_STATUS, PRODUCT_TYPES, YES_NO, DESIGNERS, PRIORITY, ENQUIRY_MODE, ENQUIRY_CANCEL_REASONS } from "@/lib/options";
import { formatStamp } from "@/lib/status";

// Status dropdown on the detail page excludes "Cancelled" — cancelling
// only happens through the dedicated Cancel flow below (with a reason).
const STATUS_OPTIONS = ENQUIRY_STATUS.filter((s) => s !== "Cancelled");

export default function EnquiryDetailPage() {
  const { enquiryId } = useParams();
  const router = useRouter();
  const [enquiry, setEnquiry] = useState(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [role, setRole] = useState("staff");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)npc_role=([^;]+)/);
    if (m) setRole(m[1]);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(enquiryId)}`, { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (res.status === 404) return setEnquiry(null);
    if (!res.ok) return setError(data.error || "Could not load the enquiry");
    const e = data.enquiry;
    setEnquiry({ ...e, ref_image: e.ref_image ? "__KEEP__" : "" });
  }, [enquiryId, router]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setEnquiry((e) => ({ ...e, [k]: v })); }

  async function save(extra = {}) {
    if (!/^\d{10}$/.test(String(enquiry.mobile || "").trim())) {
      return setError("Mobile number must be exactly 10 digits");
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/enquiries/${encodeURIComponent(enquiryId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...enquiry, cancelled: enquiry.status === "Cancelled", ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save changes");
    setEnquiry((e) => ({ ...e, status: data.status, history: JSON.stringify(data.history || []) }));
    setToast(`Saved · status is now ${data.status}`);
    setTimeout(() => setToast(""), 2500);
  }

  const cancelled = enquiry && enquiry.status === "Cancelled";

  return (
    <Shell title={String(enquiryId)} back="/enquiries">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
      {enquiry === undefined && !error && <div className="spinner" />}
      {enquiry === null && <div className="empty"><div className="h2">Enquiry not found</div></div>}

      {enquiry && (
        <>
          <article className="ticket">
            <div className="ticket-head">
              <div className="order-top">
                <span className="job-id">{enquiry.enquiry_id}</span>
                <span className={`pill ${enquiry.status === "Confirmed" ? "pill-key" : enquiry.status === "Cancelled" ? "pill-red" : enquiry.status === "Quote Sent" ? "pill-cyan" : enquiry.status === "Follow Up" ? "pill-yellow" : "pill-magenta"}`}>{enquiry.status}</span>
              </div>
              <h1 className="h1" style={{ marginTop: 8 }}>{enquiry.customer_name}</h1>
              <div className="order-meta">
                {[enquiry.mobile && `+91 ${enquiry.mobile}`, enquiry.created_at && `Created ${String(enquiry.created_at).slice(0, 10)}`, enquiry.priority === "Urgent" && "URGENT"].filter(Boolean).join(" · ")}
              </div>
              {enquiry.updated_at && <div className="order-meta">Last updated {formatStamp(enquiry.updated_at)}</div>}
              {cancelled && (
                <div className="alert alert-error" style={{ marginTop: 10 }}>This enquiry was cancelled{enquiry.cancel_reason ? ` — ${enquiry.cancel_reason}` : ""}.</div>
              )}
              {enquiry.status !== "Cancelled" && (
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <Link className="btn-ghost" style={{ textAlign: "center" }} href={`/jobs/new?enquiry=${enquiry.enquiry_id}`}>Convert to job →</Link>
                </div>
              )}
            </div>
          </article>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--magenta)" }} />Enquiry details</div>
            <div className="form-grid">
              <Field label="Customer name *" full><Text value={enquiry.customer_name} onChange={(v) => set("customer_name", v)} /></Field>
              <Field label="Mobile (10 digits) *"><Text value={enquiry.mobile} onChange={(v) => set("mobile", v.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" /></Field>
              <Field label="Enquiry mode"><SelectWithOther value={enquiry.enquiry_mode} onChange={(v) => set("enquiry_mode", v)} options={ENQUIRY_MODE} placeholder="Type the enquiry mode" /></Field>
              <Field label="Product category (select one or more)" full><MultiSelect value={enquiry.product_type} onChange={(v) => set("product_type", v)} options={PRODUCT_TYPES} placeholder="Tap to select products" /></Field>
              <Field label="Size / material"><Text value={enquiry.size_material} onChange={(v) => set("size_material", v)} placeholder="10x6 ft flex" /></Field>
              <Field label="Quantity"><Text value={enquiry.quantity} onChange={(v) => set("quantity", v)} inputMode="numeric" /></Field>
              <Field label="Design required"><Select value={enquiry.design_required || "No"} onChange={(v) => set("design_required", v)} options={YES_NO} /></Field>
              <Field label="Priority"><Select value={enquiry.priority} onChange={(v) => set("priority", v)} options={PRIORITY} /></Field>
              <Field label="System (designer)"><Select value={enquiry.designer_name} onChange={(v) => set("designer_name", v)} options={DESIGNERS} /></Field>
              {!cancelled && <Field label="Status" full><Select value={enquiry.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} /></Field>}
              <Field label="Reference image (optional, under 2 MB)" full>
                <FileUpload label="Upload reference image" value={enquiry.ref_image} onChange={(v) => set("ref_image", v)} />
              </Field>
            </div>
          </section>

          {["owner", "manager"].includes(role) && (
            <section className="section-card">
              <div className="section-title"><span className="sec-dot" style={{ background: "var(--ink-60)" }} />Activity</div>
              {(() => {
                let h = [];
                try { h = JSON.parse(enquiry.history || "[]"); } catch {}
                if (!Array.isArray(h) || h.length === 0) return <p className="muted" style={{ marginTop: 8 }}>No activity recorded yet.</p>;
                return [...h].reverse().map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 13 }}>
                    <span className="job-id" style={{ whiteSpace: "nowrap" }}>{formatStamp(e.at)}</span>
                    <span><b>{e.by}</b>{e.by ? " · " : ""}{e.text}</span>
                  </div>
                ));
              })()}
            </section>
          )}

          <div style={{ position: "sticky", bottom: "calc(78px + env(safe-area-inset-bottom))", marginTop: 16, zIndex: 24 }}>
            <button className="btn-primary" onClick={() => save()} disabled={busy}>{busy ? "Saving…" : "Save all changes"}</button>
          </div>

          {["owner", "manager"].includes(role) && (
            <div style={{ marginTop: 12 }}>
              {cancelled ? (
                <div className="btn-row">
                  <button className="btn-secondary" onClick={() => { set("status", "New Enquiry"); save({ cancelled: false, cancel_reason: "", status: "New Enquiry" }); }} disabled={busy}>Reactivate enquiry</button>
                </div>
              ) : showCancel ? (
                <div className="section-card">
                  <div className="section-title"><span className="sec-dot" style={{ background: "var(--red)" }} />Enquiry cancellation reason *</div>
                  <SelectWithOther value={cancelReason} onChange={setCancelReason} options={ENQUIRY_CANCEL_REASONS} placeholder="Type the reason" />
                  <div className="btn-row" style={{ marginTop: 12 }}>
                    <button className="btn-secondary" onClick={() => { setShowCancel(false); setCancelReason(""); }} disabled={busy}>Back</button>
                    <button className="btn-secondary btn-danger-ghost" disabled={busy || !cancelReason.trim()} onClick={() => { set("status", "Cancelled"); save({ cancelled: true, cancel_reason: cancelReason.trim(), status: "Cancelled" }); setShowCancel(false); }}>
                      {busy ? "Cancelling…" : "Confirm cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="btn-row">
                  <button className="btn-secondary btn-danger-ghost" onClick={() => setShowCancel(true)} disabled={busy}>Cancel this enquiry</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
