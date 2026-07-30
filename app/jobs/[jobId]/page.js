"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, Text, SelectWithOther, MultiSelect } from "@/components/Field";
import {
  DESIGN_STATUS, DESIGNERS, PRODUCTION_STATUS, DELIVERY_STATUS,
  WORK_TYPES, MACHINE_TYPES, PRODUCT_TYPES, PRIORITY, PAYMENT, YES_NO,
} from "@/lib/options";
import { STAGES, stagePill, stageIndex, formatStamp } from "@/lib/status";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [role, setRole] = useState("staff");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)npc_role=([^;]+)/);
    if (m) setRole(m[1]);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    if (res.status === 403) return router.replace("/production");
    const data = await res.json();
    if (res.status === 404) return setJob(null);
    if (!res.ok) return setError(data.error || "Could not load the job");
    const j = data.job;
    j.delivery_date = j.delivery_date ? String(j.delivery_date).slice(0, 10) : "";
    setJob(j);
  }, [jobId, router]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setJob((j) => ({ ...j, [k]: v })); }

  async function save(extra = {}) {
    if (!/^\d{10}$/.test(String(job.mobile || "").trim())) {
      return setError("Mobile number must be exactly 10 digits");
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...job, cancelled: job.order_status === "Cancelled", ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save changes");
    setJob((j) => ({ ...j, order_status: data.order_status, payment_status: data.payment_status, history: JSON.stringify(data.history || []) }));
    setToast(`Saved · status is now ${data.order_status}`);
    setTimeout(() => setToast(""), 2500);
  }

  const cancelled = job && job.order_status === "Cancelled";
  // Progress stages include Review as the final step (after Ready → Delivered)
  const timelineStages = [...STAGES, "Review"];
  const reviewDone = !!(job && job.review_done);
  const delivered = job && job.order_status === "Delivered";
  const currentIdx = !job || cancelled
    ? -1
    : delivered
      ? (reviewDone ? timelineStages.length : timelineStages.indexOf("Review"))
      : stageIndex(job.order_status);

  return (
    <Shell title={String(jobId)} back="/jobs">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
      {job === undefined && !error && <div className="spinner" />}
      {job === null && <div className="empty"><div className="h2">Job not found</div></div>}

      {job && (
        <>
          <article className="ticket">
            <div className="ticket-head">
              <div className="order-top">
                <span className="job-id">{job.job_id}{job.enquiry_id ? ` · from ${job.enquiry_id}` : ""}</span>
                <span className={`pill ${stagePill(job.order_status)}`}><span className="dot" />{job.order_status}</span>
              </div>
              <h1 className="h1" style={{ marginTop: 8 }}>{job.customer_name}</h1>
              <div className="order-meta">
                {[job.mobile && `+91 ${job.mobile}`, job.order_date && `Ordered ${String(job.order_date).slice(0, 10)}`, job.priority === "Urgent" && "URGENT"].filter(Boolean).join(" · ")}
              </div>
              {job.updated_at && <div className="order-meta">Last updated {formatStamp(job.updated_at)}</div>}
              {job.order_status === "Ready" && /^\d{10}$/.test(String(job.mobile || "")) && (
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <a className="btn-ghost" style={{ textAlign: "center", background: "#e7f8ee", borderColor: "#1f9d55", color: "#146c3a", fontWeight: 700 }}
                    href={`https://wa.me/91${job.mobile}?text=${encodeURIComponent(`Hi ${job.customer_name}, your order ${job.job_id} (${job.product_category}) is READY at NPC Prints & Gifts. Please collect it or await delivery. Thank you!`)}`}
                    target="_blank" rel="noopener noreferrer">Send WhatsApp — order ready</a>
                  <a className="btn-ghost" style={{ textAlign: "center" }}
                    href={`sms:+91${job.mobile}?body=${encodeURIComponent(`Hi ${job.customer_name}, your order ${job.job_id} (${job.product_category}) is READY at NPC Prints & Gifts. Thank you!`)}`}>Send SMS</a>
                </div>
              )}
            </div>
            <hr className="perforation" />
            <div className="ticket-body">
              <div className="eyebrow">Job progress</div>
              {cancelled ? (
                <div className="alert alert-error" style={{ marginTop: 10 }}>This job was cancelled.</div>
              ) : (
                <div className="timeline">
                  {timelineStages.map((stage, i) => {
                    const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
                    const isReview = stage === "Review";
                    return (
                      <div className={`stage ${state}`} key={stage}>
                        <div className="stage-rail">
                          <div className="stage-dot">
                            {state === "done" && (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>)}
                          </div>
                          {i < timelineStages.length - 1 && <div className="stage-line" />}
                        </div>
                        <div>
                          <div className="stage-title">{isReview ? "Google Review" : stage}</div>
                          {isReview && delivered && (
                            <div style={{ marginTop: 6 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                                <input type="checkbox" style={{ width: 18, height: 18, accentColor: "#1f9d55" }}
                                  checked={reviewDone}
                                  onChange={(e) => set("review_done", e.target.checked)} />
                                Google review completed
                              </label>
                              {/^\d{10}$/.test(String(job.mobile || "")) && !reviewDone && (
                                <a className="btn-ghost" style={{ display: "inline-block", marginTop: 8, background: "#e7f8ee", borderColor: "#1f9d55", color: "#146c3a", fontWeight: 700 }}
                                  href={`https://wa.me/91${job.mobile}?text=${encodeURIComponent(`Hi ${job.customer_name}, thank you for choosing NPC Prints & Gifts! We would love your feedback — please leave us a Google review. It takes just a minute!`)}`}
                                  target="_blank" rel="noopener noreferrer">Ask for review on WhatsApp</a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </article>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--ink)" }} />Job card</div>
            <div className="form-grid">
              <Field label="Customer name *"><Text value={job.customer_name} onChange={(v) => set("customer_name", v)} /></Field>
              <Field label="Mobile (10 digits) *"><Text value={job.mobile} onChange={(v) => set("mobile", v.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" /></Field>
              <Field label="Product category (select one or more)" full><MultiSelect value={job.product_category} onChange={(v) => set("product_category", v)} options={PRODUCT_TYPES} placeholder="Tap to select products" /></Field>
              <Field label="Quantity"><Text value={job.quantity} onChange={(v) => set("quantity", v)} inputMode="numeric" /></Field>
              <Field label="Design required"><Select value={job.design_required || "No"} onChange={(v) => set("design_required", v)} options={YES_NO} /></Field>
              <Field label="Delivery date"><input className="text-input" type="date" value={job.delivery_date || ""} onChange={(e) => set("delivery_date", e.target.value)} /></Field>
              <Field label="Priority"><Select value={job.priority} onChange={(v) => set("priority", v)} options={PRIORITY} /></Field>
              <Field label="Notes" full><textarea rows={2} value={job.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--magenta)" }} />Design department</div>
            <div className="form-grid">
              <Field label="Designer (system)"><Select value={job.designer_name} onChange={(v) => set("designer_name", v)} options={DESIGNERS} /></Field>
              <Field label="Design status"><Select value={job.design_status} onChange={(v) => set("design_status", v)} options={DESIGN_STATUS} /></Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--cyan)" }} />Production department</div>
            <div className="form-grid">
              <Field label="Machine type (select one or more)"><MultiSelect value={job.machine_type} onChange={(v) => set("machine_type", v)} options={MACHINE_TYPES} placeholder="Tap to select machines" /></Field>
              <Field label="Work type (select one or more)"><MultiSelect value={job.work_type} onChange={(v) => set("work_type", v)} options={WORK_TYPES} placeholder="Tap to select work types" /></Field>
              <Field label="Production status" full><Select value={job.production_status} onChange={(v) => set("production_status", v)} options={PRODUCTION_STATUS} /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              {job.production_complete ? (
                <p className="muted">
                  <span className="pill pill-key">Production complete</span>{" "}
                  <button className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => { set("production_complete", false); }}>Reopen in production</button>
                </p>
              ) : (
                <button className="btn-ghost" onClick={() => { set("production_complete", true); }}>Mark production complete</button>
              )}
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--yellow)" }} />Delivery</div>
            <div className="form-grid">
              <Field label="Delivery status" full><Select value={job.delivery_status} onChange={(v) => set("delivery_status", v)} options={DELIVERY_STATUS} /></Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--key)" }} />Payment</div>
            <div className="form-grid">
              <Field label="Payment received" full><Select value={job.payment_status} onChange={(v) => set("payment_status", v)} options={PAYMENT} /></Field>
            </div>
          </section>

          {["owner", "manager"].includes(role) && (
          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--ink-60)" }} />Activity</div>
            {(() => {
              let h = [];
              try { h = JSON.parse(job.history || "[]"); } catch {}
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
            <div className="btn-row" style={{ marginTop: 12 }}>
              {cancelled ? (
                <button className="btn-secondary" onClick={() => { set("order_status", ""); save({ cancelled: false }); }} disabled={busy}>Reactivate job</button>
              ) : (
                <button className="btn-secondary btn-danger-ghost" onClick={() => { set("order_status", "Cancelled"); save({ cancelled: true }); }} disabled={busy}>Cancel this job</button>
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
