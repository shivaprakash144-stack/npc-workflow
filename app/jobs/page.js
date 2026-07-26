"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { ORDER_STATUS } from "@/lib/options";
import { stagePill } from "@/lib/status";
import { formatINR } from "@/lib/status";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not load jobs");
    else setJobs(data.jobs);
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    let list = jobs || [];
    if (filter !== "All") list = list.filter((j) => (j.order_status || "") === filter);
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
  }, [jobs, query, filter]);

  return (
    <Shell title="Jobs">
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
      <section className="section">
        <div className="search-wrap">
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input className="search-input" placeholder="Search by Job ID, customer, or mobile" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="chip-row">
          {["All", ...ORDER_STATUS].map((s) => (
            <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        {!jobs && <div className="spinner" />}
        {jobs && filtered.length === 0 && <div className="empty">No jobs match. Create a job card or change the filter.</div>}
        {filtered.map((j) => {
          const overdue = j.delivery_date && j.delivery_date.slice(0, 10) < new Date().toISOString().slice(0, 10) && !["Delivered", "Cancelled"].includes(j.order_status);
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
                <span style={overdue ? { color: "var(--red)", fontWeight: 700 } : {}}>
                  Due {j.delivery_date ? j.delivery_date.slice(0, 10) : "—"}{overdue ? " · overdue" : ""}
                </span>
                <span>{formatINR(j.price)} · {(j.payment_status || "").toLowerCase() === "yes" ? "Paid" : "Payment pending"}</span>
              </div>
            </Link>
          );
        })}
      </section>
      <Link href="/jobs/new" className="fab">+ New job card</Link>
    </Shell>
  );
}
