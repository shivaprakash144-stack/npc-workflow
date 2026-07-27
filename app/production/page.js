"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select } from "@/components/Field";
import { PRODUCTION_STATUS, WORK_TYPES, MACHINE_TYPES } from "@/lib/options";
import { stagePill } from "@/lib/status";

export default function ProductionPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    const res = await fetch("/api/production", { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not load production jobs");
    else setJobs(data.jobs);
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  function openJob(j) {
    setOpen(j.job_id);
    setEdit({ machine_type: j.machine_type || "", work_type: j.work_type || "", production_status: j.production_status || "" });
  }

  async function save(jobId) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/production", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, ...edit }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save");
    setToast(`Saved · job status is now ${data.order_status}`);
    setTimeout(() => setToast(""), 2500);
    setOpen(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const q = query.trim().toLowerCase();
  const filtered = (jobs || []).filter((j) => {
    if (filter === "Pending" && j.production_status === "Ready") return false;
    if (filter === "Ready" && j.production_status !== "Ready") return false;
    if (q && !(j.job_id.toLowerCase().includes(q) || (j.customer_name || "").toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <Shell title="Production">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

      <section className="section">
        <div className="search-wrap">
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input className="search-input" placeholder="Search by Job ID or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chip-row">
          {["All", "Pending", "Ready"].map((s) => (
            <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>

        {!jobs && <div className="spinner" />}
        {jobs && filtered.length === 0 && <div className="empty">No jobs in production view.</div>}

        {filtered.map((j) => {
          const overdue = j.delivery_date && String(j.delivery_date).slice(0, 10) < today && j.order_status !== "Delivered";
          return (
            <div className="list-row" key={j.job_id}>
              <div className="row-top">
                <span className="job-id">{j.job_id}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  {j.priority === "Urgent" && <span className="pill pill-urgent">Urgent</span>}
                  <span className={`pill ${stagePill(j.order_status)}`}><span className="dot" />{j.order_status}</span>
                </span>
              </div>
              <div className="row-title">{j.customer_name}</div>
              <div className="row-sub">
                {[j.product_category, j.quantity && `Qty ${j.quantity}`, j.design_status && `Design: ${j.design_status}`].filter(Boolean).join(" · ")}
              </div>
              <div className="order-foot">
                <span style={overdue ? { color: "var(--red)", fontWeight: 700 } : {}}>
                  Due {j.delivery_date ? String(j.delivery_date).slice(0, 10) : "—"}{overdue ? " · overdue" : ""}
                </span>
                <span>{j.production_status || "Not started"}</span>
              </div>

              {open === j.job_id ? (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <Field label="Machine type"><Select value={edit.machine_type} onChange={(v) => setEdit((e) => ({ ...e, machine_type: v }))} options={MACHINE_TYPES} /></Field>
                  <Field label="Work type"><Select value={edit.work_type} onChange={(v) => setEdit((e) => ({ ...e, work_type: v }))} options={WORK_TYPES} /></Field>
                  <Field label="Production status" full><Select value={edit.production_status} onChange={(v) => setEdit((e) => ({ ...e, production_status: v }))} options={PRODUCTION_STATUS} /></Field>
                  <div className="btn-row full">
                    <button className="btn-secondary" onClick={() => setOpen(null)}>Cancel</button>
                    <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => save(j.job_id)} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              ) : (
                <button className="btn-ghost" style={{ marginTop: 10 }} onClick={() => openJob(j)}>Update production</button>
              )}
            </div>
          );
        })}
      </section>
    </Shell>
  );
}
