"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { stagePill, formatStamp } from "@/lib/status";

const PER_PAGE = 50;
const st = (v) => (v || "").toLowerCase();

export default function CustomersPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // mobile of the open customer

  const load = useCallback(async () => {
    try {
      const [jr, er] = await Promise.all([
        fetch("/api/jobs", { cache: "no-store" }),
        fetch("/api/enquiries", { cache: "no-store" }),
      ]);
      if (jr.status === 401) return router.replace("/login");
      if (jr.status === 403) return router.replace("/production");
      const jd = await jr.json();
      const ed = await er.json();
      if (!jr.ok) return setError(jd.error || "Could not load customers");
      setJobs(jd.jobs || []);
      setEnquiries(ed.enquiries || []);
      setError("");
    } catch {
      setError("Network problem while loading");
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Refresh when the user returns to the app (min 60s between refreshes)
  useEffect(() => {
    let last = Date.now();
    const maybe = () => {
      if (Date.now() - last > 60000) { last = Date.now(); load(); }
    };
    const onVis = () => { if (document.visibilityState === "visible") maybe(); };
    window.addEventListener("focus", maybe);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", maybe);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);


  // Build the customer database from jobs + enquiries (grouped by mobile)
  const customers = useMemo(() => {
    const map = new Map();
    for (const j of jobs || []) {
      const m = String(j.mobile || "").trim();
      if (!m) continue;
      if (!map.has(m)) map.set(m, { mobile: m, name: j.customer_name || "", jobs: [], enquiries: 0, lastOrder: "" });
      const c = map.get(m);
      c.jobs.push(j);
      if (!c.name && j.customer_name) c.name = j.customer_name;
      const d = (j.order_date || "").slice(0, 10);
      if (d > c.lastOrder) { c.lastOrder = d; c.name = j.customer_name || c.name; }
    }
    for (const e of enquiries || []) {
      const m = String(e.mobile || "").trim();
      if (!m) continue;
      if (!map.has(m)) map.set(m, { mobile: m, name: e.customer_name || "", jobs: [], enquiries: 0, lastOrder: "" });
      map.get(m).enquiries += 1;
    }
    const list = [...map.values()].map((c) => ({
      ...c,
      total: c.jobs.length,
      delivered: c.jobs.filter((j) => st(j.order_status) === "delivered").length,
      pending: c.jobs.filter((j) => !["delivered", "cancelled"].includes(st(j.order_status))).length,
    }));
    list.sort((a, b) => (b.lastOrder || "").localeCompare(a.lastOrder || ""));
    return list;
  }, [jobs, enquiries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.name || "").toLowerCase().includes(q) || c.mobile.includes(q));
  }, [customers, query]);

  useEffect(() => { setPage(1); }, [query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openCustomer = useMemo(() => customers.find((c) => c.mobile === selected) || null, [customers, selected]);

  async function downloadReport() {
    const XLSX = await import("xlsx");
    const rows = filtered.map((c) => ({
      "Customer": c.name,
      "Mobile": c.mobile,
      "Total Orders": c.total,
      "Delivered": c.delivered,
      "Pending": c.pending,
      "Enquiries": c.enquiries,
      "Last Order": c.lastOrder || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NPC-Customers-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return (
    <Shell title="Customers">
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

      {openCustomer ? (
        <section className="section">
          <div className="row-top">
            <div className="eyebrow">Customer</div>
            <button className="btn-ghost" onClick={() => setSelected(null)}>← Back to all customers</button>
          </div>
          <div className="section-card" style={{ marginTop: 10 }}>
            <div className="h2">{openCustomer.name || "—"}</div>
            <div className="row-sub">+91 {openCustomer.mobile}</div>
            <div className="row-sub" style={{ marginTop: 4 }}>
              {openCustomer.total} order{openCustomer.total === 1 ? "" : "s"} · {openCustomer.delivered} delivered · {openCustomer.pending} pending · {openCustomer.enquiries} enquir{openCustomer.enquiries === 1 ? "y" : "ies"} · Last order {openCustomer.lastOrder || "—"}
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <Link className="btn-primary" style={{ textAlign: "center" }} href={`/jobs/new?name=${encodeURIComponent(openCustomer.name || "")}&mobile=${encodeURIComponent(openCustomer.mobile)}`}>+ New job card for this customer</Link>
            </div>
          </div>

          <div className="eyebrow" style={{ marginTop: 16 }}>All orders ({openCustomer.jobs.length})</div>
          {openCustomer.jobs.length === 0 && <div className="empty">No job cards yet for this customer.</div>}
          {[...openCustomer.jobs]
            .sort((a, b) => String(b.order_date || "").localeCompare(String(a.order_date || "")))
            .map((j) => (
              <Link href={`/jobs/${j.job_id}`} className="list-row" key={j.job_id}>
                <div className="row-top">
                  <span className="job-id">{j.job_id}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {j.priority === "Urgent" && <span className="pill pill-urgent">Urgent</span>}
                    <span className={`pill ${stagePill(j.order_status)}`}><span className="dot" />{j.order_status}</span>
                  </span>
                </div>
                <div className="row-sub">{[String(j.order_date || "").slice(0, 10), j.product_category, j.quantity && `Qty ${j.quantity}`].filter(Boolean).join(" · ")}</div>
                <div className="order-foot">
                  <span>Due {j.delivery_date ? String(j.delivery_date).slice(0, 10) : "—"}</span>
                  <span>{(j.payment_status || "").toLowerCase() === "yes" ? "Paid" : "Payment pending"}</span>
                </div>
              </Link>
            ))}
        </section>
      ) : (
        <section className="section">
          <div className="search-wrap">
            <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
            <input className="search-input" placeholder="Search by name or mobile" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <p className="muted" style={{ marginTop: 8 }}>{filtered.length} customer{filtered.length === 1 ? "" : "s"} · tap a customer to see all their orders</p>

          {!jobs && <div className="spinner" />}
          {jobs && filtered.length === 0 && <div className="empty">No customers found.</div>}
          {pageRows.map((c) => (
            <div className="list-row" key={c.mobile} role="button" style={{ cursor: "pointer" }} onClick={() => { setSelected(c.mobile); window.scrollTo({ top: 0 }); }}>
              <div className="row-top">
                <span className="row-title">{c.name || "—"}</span>
                <span className="pill pill-gray">{c.total} order{c.total === 1 ? "" : "s"}</span>
              </div>
              <div className="row-sub">+91 {c.mobile}</div>
              <div className="order-foot">
                <span>Last order {c.lastOrder || "—"}</span>
                <span>{c.pending > 0 ? `${c.pending} pending` : "Nothing pending"}</span>
              </div>
            </div>
          ))}

          {pages > 1 && (
            <div className="chip-row" style={{ marginTop: 14, justifyContent: "center" }}>
              <button className="chip" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`chip ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>Page {p}</button>
              ))}
              <button className="chip" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next ›</button>
            </div>
          )}

          <button className="btn-secondary" style={{ marginTop: 16 }} onClick={downloadReport} disabled={filtered.length === 0}>Download customer report (Excel)</button>
        </section>
      )}
    </Shell>
  );
}
