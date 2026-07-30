"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { ORDER_STATUS, DESIGNERS } from "@/lib/options";
import { stagePill, formatStamp } from "@/lib/status";

const PER_PAGE = 30;
const todayStr = () => new Date().toISOString().slice(0, 10);
const active = (j) => !["Delivered", "Cancelled"].includes(j.order_status);

// Filter chips: label + matching rule (counts are shown on every chip)
const CHIPS = [
  { key: "All", fn: () => true },
  { key: "Today delivery", fn: (j) => j.delivery_date && String(j.delivery_date).slice(0, 10) === todayStr() && active(j) },
  { key: "Overdue", fn: (j) => j.delivery_date && String(j.delivery_date).slice(0, 10) < todayStr() && active(j) },
  { key: "Design required", fn: (j) => String(j.design_required || "") === "Yes" },
  ...ORDER_STATUS.map((s) => ({ key: s, fn: (j) => String(j.order_status || "").trim().toLowerCase() === s.toLowerCase() })),
  { key: "Review Pending", fn: (j) => j.order_status === "Delivered" && !j.review_done },
];

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [system, setSystem] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    if (res.status === 403) return router.replace("/production");
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not load jobs");
    else setJobs(data.jobs);
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Base list: search + dates + system applied (chip counts are computed on this)
  const baseList = useMemo(() => {
    let list = jobs || [];
    if (from) list = list.filter((j) => (j.order_date || "").slice(0, 10) >= from);
    if (to) list = list.filter((j) => (j.order_date || "").slice(0, 10) <= to);
    if (system) list = list.filter((j) => (j.designer_name || "") === system);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (j) =>
          (j.job_id || "").toLowerCase().includes(q) ||
          (j.customer_name || "").toLowerCase().includes(q) ||
          (j.mobile || "").includes(q)
      );
    }
    return list;
  }, [jobs, query, from, to, system]);

  const counts = useMemo(() => {
    const c = {};
    for (const ch of CHIPS) c[ch.key] = baseList.filter(ch.fn).length;
    return c;
  }, [baseList]);

  const filtered = useMemo(() => {
    const ch = CHIPS.find((c) => c.key === filter) || CHIPS[0];
    return baseList.filter(ch.fn);
  }, [baseList, filter]);

  // Pagination: 30 per page
  useEffect(() => { setPage(1); }, [query, filter, from, to, system]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ✓ Complete (same as Production page): marks production Ready + complete
  async function markComplete(e, j) {
    e.preventDefault();
    setBusyId(j.job_id);
    setError("");
    const res = await fetch(`/api/jobs/${encodeURIComponent(j.job_id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...j,
        delivery_date: j.delivery_date ? String(j.delivery_date).slice(0, 10) : "",
        production_status: "Ready",
        production_complete: true,
        cancelled: false,
      }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) return setError(data.error || "Could not mark complete");
    setToast(`Completed · ${j.job_id} is now ${data.order_status}`);
    setTimeout(() => setToast(""), 2500);
    load();
  }

  return (
    <Shell title="Jobs">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
      <section className="section">
        <div className="search-wrap">
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input className="search-input" placeholder="Search by Job ID, customer, or mobile" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="form-grid" style={{ marginTop: 10 }}>
          <div>
            <label className="f-label">From date</label>
            <input className="text-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="f-label">To date</label>
            <input className="text-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="full">
            <label className="f-label">System (designer)</label>
            <select value={system} onChange={(e) => setSystem(e.target.value)}>
              {DESIGNERS.map((d) => <option key={d || "all"} value={d}>{d === "" ? "All systems" : d}</option>)}
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
        {jobs && filtered.length === 0 && <div className="empty">No jobs match these filters.</div>}
        {pageRows.map((j) => {
          const overdue = j.delivery_date && String(j.delivery_date).slice(0, 10) < todayStr() && active(j);
          const dueToday = j.delivery_date && String(j.delivery_date).slice(0, 10) === todayStr() && active(j);
          const canComplete = active(j) && !j.production_complete;
          return (
            <Link href={`/jobs/${j.job_id}`} className="list-row" key={j.job_id}>
              <div className="row-top">
                <span className="job-id">{j.job_id}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  {j.priority === "Urgent" && <span className="pill pill-urgent">Urgent</span>}
                  <span className={`pill ${stagePill(j.order_status)}`}><span className="dot" />{j.order_status}</span>
                </span>
              </div>
              <div className="row-title">{j.customer_name}</div>
              <div className="row-sub">{[j.product_category, j.quantity && `Qty ${j.quantity}`, j.work_type].filter(Boolean).join(" · ")}</div>
              <div className="order-foot">
                <span style={overdue ? { color: "var(--red)", fontWeight: 700 } : dueToday ? { color: "var(--ink)", fontWeight: 700 } : {}}>
                  Due {j.delivery_date ? String(j.delivery_date).slice(0, 10) : "—"}{overdue ? " · overdue" : dueToday ? " · today" : ""}
                </span>
                <span>{(j.payment_status || "").toLowerCase() === "yes" ? "Paid" : "Payment pending"}</span>
              </div>
              {j.updated_at && <div className="row-sub" style={{ marginTop: 4 }}>Last updated {formatStamp(j.updated_at)}</div>}
              <div className="btn-row" style={{ marginTop: 8 }}>
                {j.order_status === "Ready" && /^\d{10}$/.test(String(j.mobile || "")) && (
                  <span
                    className="btn-ghost"
                    style={{ display: "inline-block", background: "#e7f8ee", borderColor: "#1f9d55", color: "#146c3a", fontWeight: 700 }}
                    role="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(`https://wa.me/91${j.mobile}?text=${encodeURIComponent(`Hi ${j.customer_name}, your order ${j.job_id} (${j.product_category}) is READY at NPC Prints & Gifts. Please collect it or await delivery. Thank you!`)}`, "_blank");
                    }}
                  >WhatsApp: order ready</span>
                )}
                {canComplete && (
                  <span
                    className="btn-ghost"
                    role="button"
                    style={{ display: "inline-block", borderColor: "var(--ink)", fontWeight: 700, opacity: busyId === j.job_id ? 0.5 : 1 }}
                    onClick={(e) => busyId ? e.preventDefault() : markComplete(e, j)}
                  >✓ Complete</span>
                )}
              </div>
              {j.order_status === "Delivered" && (
                <span className={`pill ${j.review_done ? "pill-key" : "pill-yellow"}`} style={{ marginTop: 8 }}>{j.review_done ? "Review done ✓" : "Review pending"}</span>
              )}
            </Link>
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
      <Link href="/jobs/new" className="fab">+ New job card</Link>
    </Shell>
  );
}
