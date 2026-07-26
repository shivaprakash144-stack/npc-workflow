"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, Text, FileUpload } from "@/components/Field";
import {
  ORDER_STATUS, DESIGN_STATUS, PRODUCTION_STATUS, DELIVERY_STATUS,
  DELIVERY_METHOD, WORK_TYPES, MACHINE_TYPES, PRODUCT_TYPES, PRIORITY, PAYMENT,
} from "@/lib/options";
import { STAGES, stagePill, stageIndex, formatINR } from "@/lib/status";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (res.status === 404) return setJob(null);
    if (!res.ok) return setError(data.error || "Could not load the job");
    const j = data.job;
    j.delivery_date = j.delivery_date ? String(j.delivery_date).slice(0, 10) : "";
    setJob(j);
  }, [jobId, router]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setJob((j) => ({ ...j, [k]: v })); }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save changes");
    setToast("Saved");
    setTimeout(() => setToast(""), 2000);
  }

  const currentIdx = job ? stageIndex(job.order_status) : -1;
  const cancelled = job && job.order_status === "Cancelled";

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
            </div>
            <hr className="perforation" />
            <div className="ticket-body">
              <div className="eyebrow">Job progress</div>
              {cancelled ? (
                <div className="alert alert-error" style={{ marginTop: 10 }}>This job was cancelled.</div>
              ) : (
                <div className="timeline">
                  {STAGES.map((stage, i) => {
                    const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
                    return (
                      <div className={`stage ${state}`} key={stage}>
                        <div className="stage-rail">
                          <div className="stage-dot">
                            {state === "done" && (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>)}
                          </div>
                          {i < STAGES.length - 1 && <div className="stage-line" />}
                        </div>
                        <div>
                          <div className="stage-title">{stage}</div>
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
              <Field label="Customer name"><Text value={job.customer_name} onChange={(v) => set("customer_name", v)} /></Field>
              <Field label="Mobile"><Text value={job.mobile} onChange={(v) => set("mobile", v)} inputMode="numeric" /></Field>
              <Field label="Product category"><Select value={job.product_category} onChange={(v) => set("product_category", v)} options={PRODUCT_TYPES} /></Field>
              <Field label="Quantity"><Text value={job.quantity} onChange={(v) => set("quantity", v)} inputMode="numeric" /></Field>
              <Field label="Delivery date"><input className="text-input" type="date" value={job.delivery_date || ""} onChange={(e) => set("delivery_date", e.target.value)} /></Field>
              <Field label="Priority"><Select value={job.priority} onChange={(v) => set("priority", v)} options={PRIORITY} /></Field>
              <Field label="Order status" full><Select value={job.order_status} onChange={(v) => set("order_status", v)} options={ORDER_STATUS} /></Field>
              <Field label="Notes" full><textarea rows={2} value={job.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--magenta)" }} />Design department</div>
            <div className="form-grid">
              <Field label="Designer name"><Text value={job.designer_name} onChange={(v) => set("designer_name", v)} placeholder="Designer" /></Field>
              <Field label="Design status"><Select value={job.design_status} onChange={(v) => set("design_status", v)} options={DESIGN_STATUS} /></Field>
              <Field label="Design file (image or PDF, under 2 MB)" full>
                <FileUpload label="Upload design file" value={job.design_file} onChange={(v) => set("design_file", v)} />
              </Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--cyan)" }} />Production department</div>
            <div className="form-grid">
              <Field label="Machine type"><Select value={job.machine_type} onChange={(v) => set("machine_type", v)} options={MACHINE_TYPES} /></Field>
              <Field label="Work type"><Select value={job.work_type} onChange={(v) => set("work_type", v)} options={WORK_TYPES} /></Field>
              <Field label="Production status" full><Select value={job.production_status} onChange={(v) => set("production_status", v)} options={PRODUCTION_STATUS} /></Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--yellow)" }} />Delivery / dispatch</div>
            <div className="form-grid">
              <Field label="Delivery method"><Select value={job.delivery_method} onChange={(v) => set("delivery_method", v)} options={DELIVERY_METHOD} /></Field>
              <Field label="Delivery status"><Select value={job.delivery_status} onChange={(v) => set("delivery_status", v)} options={DELIVERY_STATUS} /></Field>
              <Field label="Courier name"><Text value={job.courier_name} onChange={(v) => set("courier_name", v)} placeholder="DTDC" /></Field>
              <Field label="Tracking number"><Text value={job.tracking_number} onChange={(v) => set("tracking_number", v)} /></Field>
            </div>
          </section>

          <section className="section-card">
            <div className="section-title"><span className="sec-dot" style={{ background: "var(--key)" }} />Payment</div>
            <div className="form-grid">
              <Field label="Price (₹)"><Text value={job.price} onChange={(v) => set("price", v)} inputMode="numeric" /></Field>
              <Field label="Advance paid (₹)"><Text value={job.advance} onChange={(v) => set("advance", v)} inputMode="numeric" /></Field>
              <Field label="Payment received" full><Select value={job.payment_status} onChange={(v) => set("payment_status", v)} options={PAYMENT} /></Field>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              Balance: {formatINR(Math.max(0, (Number(job.price) || 0) - (Number(job.advance) || 0)))}
            </p>
          </section>

          <div style={{ position: "sticky", bottom: "calc(78px + env(safe-area-inset-bottom))", marginTop: 16, zIndex: 24 }}>
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save all changes"}</button>
          </div>
        </>
      )}
    </Shell>
  );
}
