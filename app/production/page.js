"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, MultiSelect } from "@/components/Field";
import { PRODUCTION_STATUS, WORK_TYPES, MACHINE_TYPES, PRODUCTION_UNITS } from "@/lib/options";
import { stagePill, formatStamp } from "@/lib/status";

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const PER_PAGE = 50;

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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unit, setUnit] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const res = await fetch("/api/production", { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not load production jobs");
    else setJobs(data.jobs);
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 300000); // 5 min — reduces database network transfer
    return () => clearInterval(t);
  }, [load]);

  function openJob(j) {
    setOpen(j.job_id);
    setEdit({ machine_type: j.machine_type || "", work_type: j.work_type || "", production_status: j.production_status || "", production_unit: j.production_unit || "" });
  }

  async function save(jobId, extra = {}) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/production", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, ...edit, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save");
    setToast(extra.complete ? "Completed · moved to the Completed list" : `Saved · job status is now ${data.order_status}`);
    setTimeout(() => setToast(""), 2500);
    setOpen(null);
    load();
  }

  async function markComplete(j) {
    setEdit({ machine_type: j.machine_type || "", work_type: j.work_type || "", production_status: "Ready", production_unit: j.production_unit || "" });
    await save(j.job_id, { complete: true, production_status: "Ready" });
  }

  const today = todayStr();
  const q = query.trim().toLowerCase();

  // Base list: search applied (chip counts computed on this)
  const baseList = useMemo(() => {
    let list = jobs || [];
    // Default view: last 30 days (set the From date to see older jobs)
    if (from) list = list.filter((j) => String(j.order_date || "").slice(0, 10) >= from);
    else list = list.filter((j) => String(j.order_date || "").slice(0, 10) >= daysAgo(30));
    if (to) list = list.filter((j) => String(j.order_date || "").slice(0, 10) <= to);
    if (unit) list = list.filter((j) => (j.production_unit || "") === unit);
    if (q) {
      list = list.filter((j) =>
        j.job_id.toLowerCase().includes(q) ||
        (j.customer_name || "").toLowerCase().includes(q) ||
        (j.mobile || "").includes(q)
      );
    }
    return list;
  }, [jobs, q, from, to, unit]);

  const CHIPS = useMemo(() => ([
    { key: "All", fn: (j) => !j.production_complete },
    { key: "Pending", fn: (j) => !j.production_complete && j.production_status !== "Ready" },
    { key: "Ready", fn: (j) => !j.production_complete && j.production_status === "Ready" },
    { key: "Today delivery", fn: (j) => !j.production_complete && j.delivery_date && String(j.delivery_date).slice(0, 10) === today },
    { key: "Overdue", fn: (j) => !j.production_complete && j.delivery_date && String(j.delivery_date).slice(0, 10) < today && j.order_status !== "Delivered" },
    { key: "Completed", fn: (j) => !!j.production_complete },
  ]), [today]);

  const counts = useMemo(() => {
    const c = {};
    for (const ch of CHIPS) c[ch.key] = baseList.filter(ch.fn).length;
    return c;
  }, [baseList, CHIPS]);

  const filtered = useMemo(() => {
    const ch = CHIPS.find((c) => c.key === filter) || CHIPS[0];
    return baseList.filter(ch.fn);
  }, [baseList, filter, CHIPS]);

  useEffect(() => { setPage(1); }, [query, filter, from, to, unit]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Shell title="Production">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

      <section className="section">
        <div className="search-wrap">
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input className="search-input" placeholder="Search by Job ID, customer, or mobile" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="form-grid" style={{ marginTop: 10 }}>
          <div>
            <label className="f-label">From date (default: last 30 days)</label>
            <input className="text-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="f-label">To date</label>
            <input className="text-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="full">
            <label className="f-label">Production unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {PRODUCTION_UNITS.map((u) => <option key={u || "all"} value={u}>{u === "" ? "All units" : u}</option>)}
            </select>
          </div>
        </div>
        <div className="chip-row">
          {CHIPS.map(({ key }) => (
            <button key={key} className={`chip ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
              {key} ({counts[key] ?? 0})
            </button>
          ))}
        </div>

        {!jobs && <div className="spinner" />}
        {jobs && filtered.length === 0 && <div className="empty">No jobs in this view.</div>}

        {pageRows.map((j) => {
          const overdue = j.delivery_date && String(j.delivery_date).slice(0, 10) < today && j.order_status !== "Delivered";
          const dueToday = j.delivery_date && String(j.delivery_date).slice(0, 10) === today;
          return (
            <div className="list-row" key={j.job_id}>
              <div className="row-top">
                <span className="job-id">{j.job_id}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  {j.priority === "Urgent" && <span className="pill pill-urgent">Urgent</span>}
                  {j.production_complete && <span className="pill pill-key">Completed</span>}
                  <span className={`pill ${stagePill(j.order_status)}`}><span className="dot" />{j.order_status}</span>
                </span>
              </div>
              <div className="row-title">{j.customer_name}</div>
              <div className="row-sub">
                {[j.product_category, j.quantity && `Qty ${j.quantity}`, j.mobile && `+91 ${j.mobile}`, j.design_status && `Design: ${j.design_status}`].filter(Boolean).join(" · ")}
              </div>
              <div className="order-foot">
                <span style={overdue ? { color: "var(--red)", fontWeight: 700 } : dueToday ? { fontWeight: 700 } : {}}>
                  Due {j.delivery_date ? String(j.delivery_date).slice(0, 10) : "—"}{overdue ? " · overdue" : dueToday ? " · today" : ""}
                </span>
                <span>{[j.production_unit, j.production_status || "Not started"].filter(Boolean).join(" · ")}</span>
              </div>
              {j.updated_at && <div className="row-sub" style={{ marginTop: 4 }}>Last updated {formatStamp(j.updated_at)}</div>}

              {open === j.job_id ? (
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <Field label="Machine type (select one or more)"><MultiSelect value={edit.machine_type} onChange={(v) => setEdit((e) => ({ ...e, machine_type: v }))} options={MACHINE_TYPES} placeholder="Tap to select machines" /></Field>
                  <Field label="Work type (select one or more)"><MultiSelect value={edit.work_type} onChange={(v) => setEdit((e) => ({ ...e, work_type: v }))} options={WORK_TYPES} placeholder="Tap to select work types" /></Field>
                  <Field label="Production unit"><Select value={edit.production_unit} onChange={(v) => setEdit((e) => ({ ...e, production_unit: v }))} options={PRODUCTION_UNITS} /></Field>
                  <Field label="Production status" full><Select value={edit.production_status} onChange={(v) => setEdit((e) => ({ ...e, production_status: v }))} options={PRODUCTION_STATUS} /></Field>
                  <div className="btn-row full">
                    <button className="btn-secondary" onClick={() => setOpen(null)}>Cancel</button>
                    <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => save(j.job_id)} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              ) : !j.production_complete ? (
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn-ghost" onClick={() => openJob(j)}>Update production</button>
                  <button className="btn-ghost" style={{ borderColor: "var(--ink)", fontWeight: 700 }} onClick={() => markComplete(j)} disabled={busy}>✓ Complete</button>
                </div>
              ) : null}
            </div>
          );
        })}

        {pages > 1 && (
          <div className="chip-row" style={{ marginTop: 14, justifyContent: "center" }}>
            <button className="chip" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`chip ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>Page {p}</button>
            ))}
            <button className="chip" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next ›</button>
          </div>
        )}
      </section>
    </Shell>
  );
}
