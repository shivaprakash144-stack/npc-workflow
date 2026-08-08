"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select } from "@/components/Field";
import Pie from "@/components/Pie";
import { ORDER_STATUS, WORK_TYPES, MACHINE_TYPES } from "@/lib/options";
import { stagePill, stageColorVar, formatStamp } from "@/lib/status";

const today = () => new Date().toISOString().slice(0, 10);
const st = (v) => (v || "").toLowerCase();

const DRILLS = {
  today: { label: "Today's orders", accent: "var(--ink)", fn: (j) => (j.order_date || "").slice(0, 10) === today() },
  todayDelivery: { label: "Today's deliveries", accent: "var(--yellow)", fn: (j) => j.delivery_date && String(j.delivery_date).slice(0, 10) === today() && !["delivered", "cancelled"].includes(st(j.order_status)) },
  designPending: { label: "Design pending", accent: "var(--magenta)", fn: (j) => ["design pending", "design approval"].includes(st(j.order_status)) },
  production: { label: "Production pending", accent: "var(--cyan)", fn: (j) => st(j.order_status) === "production" },
  ready: { label: "Ready for delivery", accent: "var(--yellow)", fn: (j) => st(j.order_status) === "ready" },
  pendingPay: { label: "Pending payment", accent: "var(--red)", fn: (j) => st(j.payment_status) !== "yes" && st(j.order_status) !== "cancelled" },
  overdue: { label: "Overdue deliveries", accent: "var(--red)", fn: (j) => j.delivery_date && String(j.delivery_date).slice(0, 10) < today() && !["delivered", "cancelled"].includes(st(j.order_status)) },
  reviewPending: { label: "Review pending", accent: "var(--yellow)", fn: (j) => st(j.order_status) === "delivered" && !j.review_done },
  delivered: { label: "Completed orders", accent: "var(--key)", fn: (j) => st(j.order_status) === "delivered" },
  newEnq: { label: "New enquiries", accent: "var(--magenta)", fn: null }, // enquiries drill
};

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState(null);
  const [rf, setRf] = useState({ from: "", to: "", machine: "", work: "", status: "All" });
  const [rPage, setRPage] = useState(1);

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
      if (!jr.ok) setError(jd.error || "Could not load jobs");
      else {
        setJobs(jd.jobs);
        setEnquiries(ed.enquiries || []);
        setError("");
      }
    } catch {
      setError("Network problem while loading");
    }
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 300000); // 5 min — reduces database network transfer
    return () => clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const list = jobs || [];
    const c = {};
    for (const key of Object.keys(DRILLS)) {
      c[key] = key === "newEnq"
        ? enquiries.filter((e) => (e.status || "") === "New Enquiry").length
        : list.filter(DRILLS[key].fn).length;
    }
    return c;
  }, [jobs, enquiries]);

  const drillJobs = useMemo(() => {
    if (!drill || drill === "newEnq" || !jobs) return [];
    return jobs.filter(DRILLS[drill].fn);
  }, [drill, jobs]);

  const drillEnqs = useMemo(() => {
    if (drill !== "newEnq") return [];
    return enquiries.filter((e) => (e.status || "") === "New Enquiry");
  }, [drill, enquiries]);

  const summary = useMemo(() => {
    const list = jobs || [];
    return {
      total: list.length,
      delivered: list.filter((j) => st(j.order_status) === "delivered").length,
      pending: list.filter((j) => !["delivered", "cancelled"].includes(st(j.order_status))).length,
      byStage: ORDER_STATUS.filter((x) => x !== "Cancelled").map((stage) => ({
        stage,
        count: list.filter((j) => st(j.order_status) === stage.toLowerCase()).length,
      })),
    };
  }, [jobs]);

  const maxStage = Math.max(1, ...summary.byStage.map((x) => x.count));

  const reportRows = useMemo(() => {
    let list = jobs || [];
    if (rf.from) list = list.filter((j) => (j.order_date || "").slice(0, 10) >= rf.from);
    if (rf.to) list = list.filter((j) => (j.order_date || "").slice(0, 10) <= rf.to);
    if (rf.machine) list = list.filter((j) => (j.machine_type || "").includes(rf.machine));
    if (rf.work) list = list.filter((j) => (j.work_type || "").includes(rf.work));
    if (rf.status !== "All") list = list.filter((j) => (j.order_status || "") === rf.status);
    return list;
  }, [jobs, rf]);

  useEffect(() => { setRPage(1); }, [rf]);
  const R_PER = 50;
  const rPages = Math.max(1, Math.ceil(reportRows.length / R_PER));
  const rRows = reportRows.slice((rPage - 1) * R_PER, rPage * R_PER);

  function jobToRow(j) {
    return {
      "Job ID": j.job_id,
      "Order Date": (j.order_date || "").slice(0, 10),
      "Customer": j.customer_name,
      "Mobile": j.mobile,
      "Product": j.product_category,
      "Quantity": j.quantity,
      "Work Type": j.work_type,
      "Machine Type": j.machine_type,
      "Designer": j.designer_name,
      "Design Required": j.design_required || "No",
      "Design Status": j.design_status,
      "Production Status": j.production_status,
      "Delivery Status": j.delivery_status,
      "Order Status": j.order_status,
      "Priority": j.priority,
      "Delivery Date": j.delivery_date ? String(j.delivery_date).slice(0, 10) : "",
      "Payment": j.payment_status,
      "Google Review": st(j.order_status) === "delivered" ? (j.review_done ? "Done" : "Pending") : "",
      "Last Updated": j.updated_at ? formatStamp(j.updated_at) : "",
      "Notes": j.notes,
    };
  }

  async function downloadExcel(rows, name) {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map(jobToRow));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return (
    <Shell title="Dashboard">
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
      {!jobs && !error && <div className="spinner" aria-label="Loading" />}
      {jobs && (
        <>
          <section className="section">
            <div className="eyebrow">Today at a glance · tap a card to see the orders</div>
            <div className="stat-grid">
              {Object.entries(DRILLS).map(([key, d]) => (
                <button
                  key={key}
                  className="stat-card"
                  onClick={() => setDrill(drill === key ? null : key)}
                  style={{
                    "--accent": d.accent,
                    textAlign: "left",
                    cursor: "pointer",
                    border: drill === key ? "2px solid var(--ink)" : "1px solid var(--line)",
                  }}
                >
                  <div className="stat-num" style={{ textDecoration: "underline", textDecorationThickness: 2, textUnderlineOffset: 4 }}>
                    {counts[key]}
                  </div>
                  <div className="stat-label">{d.label}</div>
                </button>
              ))}
            </div>
          </section>

          {drill && (
            <section className="section">
              <div className="row-top">
                <div className="eyebrow">{DRILLS[drill].label} ({drill === "newEnq" ? drillEnqs.length : drillJobs.length})</div>
                <button className="btn-ghost" onClick={() => setDrill(null)}>✕ Close</button>
              </div>

              {drill === "newEnq" ? (
                <>
                  {drillEnqs.length === 0 && <div className="empty">No new enquiries right now.</div>}
                  {drillEnqs.map((e) => (
                    <Link href="/enquiries" className="list-row" key={e.enquiry_id}>
                      <div className="row-top">
                        <span className="job-id">{e.enquiry_id}</span>
                        <span className="pill pill-magenta">{e.status}</span>
                      </div>
                      <div className="row-title">{e.customer_name}</div>
                      <div className="row-sub">{[e.product_type, e.quantity && `Qty ${e.quantity}`].filter(Boolean).join(" · ")}</div>
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  {drillJobs.length === 0 && <div className="empty">No jobs in this list right now.</div>}
                  {drillJobs.map((j) => (
                    <Link href={`/jobs/${j.job_id}`} className="list-row" key={j.job_id}>
                      <div className="row-top">
                        <span className="job-id">{j.job_id}</span>
                        <span style={{ display: "flex", gap: 6 }}>
                          {j.priority === "Urgent" && <span className="pill pill-urgent">Urgent</span>}
                          <span className={`pill ${stagePill(j.order_status)}`}><span className="dot" />{j.order_status}</span>
                        </span>
                      </div>
                      <div className="row-title">{j.customer_name}</div>
                      <div className="row-sub">{[j.product_category, j.quantity && `Qty ${j.quantity}`].filter(Boolean).join(" · ")}</div>
                      <div className="order-foot">
                        <span>Due {j.delivery_date ? String(j.delivery_date).slice(0, 10) : "—"}</span>
                        <span>
                          {drill === "reviewPending" || drill === "delivered"
                            ? (j.review_done ? "Review done ✓" : "Review pending")
                            : ((j.payment_status || "").toLowerCase() === "yes" ? "Paid" : "Payment pending")}
                        </span>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </section>
          )}

          <section className="section">
            <div className="eyebrow">Analytics</div>
            <div className="panel">
              <div className="h2">{summary.delivered} completed · {summary.pending} pending of {summary.total} jobs</div>
              {summary.byStage.map((x) => (
                <div className="bar-row" key={x.stage}>
                  <div className="bar-label">{x.stage}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(x.count / maxStage) * 100}%`, background: stageColorVar(x.stage) }} /></div>
                  <div className="bar-count">{x.count}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="section" id="reports">
            <div className="eyebrow">Reports</div>
            <div className="section-card" style={{ marginTop: 10 }}>
              <div className="form-grid">
                <Field label="From date"><input className="text-input" type="date" value={rf.from} onChange={(e) => setRf((f) => ({ ...f, from: e.target.value }))} /></Field>
                <Field label="To date"><input className="text-input" type="date" value={rf.to} onChange={(e) => setRf((f) => ({ ...f, to: e.target.value }))} /></Field>
                <Field label="Machine type"><Select value={rf.machine} onChange={(v) => setRf((f) => ({ ...f, machine: v }))} options={MACHINE_TYPES} /></Field>
                <Field label="Work type"><Select value={rf.work} onChange={(v) => setRf((f) => ({ ...f, work: v }))} options={WORK_TYPES} /></Field>
                <Field label="Order status" full><Select value={rf.status} onChange={(v) => setRf((f) => ({ ...f, status: v }))} options={["All", ...ORDER_STATUS]} /></Field>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>{reportRows.length} job{reportRows.length === 1 ? "" : "s"} match these filters.</p>
              <Pie data={ORDER_STATUS.map((s2) => ({
                label: s2,
                count: reportRows.filter((j) => (j.order_status || "") === s2).length,
                color: stageColorVar(s2),
              }))} />
              {reportRows.length > 0 && (
                <div style={{ overflowX: "auto", marginTop: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}>
                        {["Job ID", "Date", "Customer", "Product", "System", "Status", "Due", "Payment"].map((h) => (
                          <th key={h} style={{ padding: "8px 8px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rRows.map((j) => (
                        <tr key={j.job_id} style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => router.push(`/jobs/${j.job_id}`)}>
                          <td style={{ padding: "7px 8px", whiteSpace: "nowrap", fontWeight: 600 }}>{j.job_id}</td>
                          <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>{(j.order_date || "").slice(0, 10)}</td>
                          <td style={{ padding: "7px 8px" }}>{j.customer_name}</td>
                          <td style={{ padding: "7px 8px" }}>{j.product_category}</td>
                          <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>{j.designer_name || "—"}</td>
                          <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>{j.order_status}</td>
                          <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>{j.delivery_date ? String(j.delivery_date).slice(0, 10) : "—"}</td>
                          <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>{(j.payment_status || "").toLowerCase() === "yes" ? "Paid" : "Pending"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rPages > 1 && (
                    <div className="chip-row" style={{ marginTop: 10, justifyContent: "center" }}>
                      <button className="chip" disabled={rPage <= 1} onClick={() => setRPage(rPage - 1)}>‹ Prev</button>
                      {Array.from({ length: rPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} className={`chip ${p === rPage ? "active" : ""}`} onClick={() => setRPage(p)}>Page {p}</button>
                      ))}
                      <button className="chip" disabled={rPage >= rPages} onClick={() => setRPage(rPage + 1)}>Next ›</button>
                    </div>
                  )}
                </div>
              )}
              <button className="btn-primary" onClick={() => downloadExcel(reportRows, "NPC-Report")} disabled={reportRows.length === 0}>Download Excel report (filtered)</button>
              <button className="btn-secondary" onClick={() => downloadExcel(jobs || [], "NPC-All-Job-Cards")} disabled={(jobs || []).length === 0}>Download ALL job cards (Excel)</button>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}
