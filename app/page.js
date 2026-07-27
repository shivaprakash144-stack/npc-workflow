"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select } from "@/components/Field";
import Pie from "@/components/Pie";
import { ORDER_STATUS, WORK_TYPES, MACHINE_TYPES } from "@/lib/options";
import { stagePill, stageColorVar } from "@/lib/status";

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [error, setError] = useState("");
  const [rf, setRf] = useState({ from: "", to: "", machine: "", work: "", status: "All" });

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
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const s = useMemo(() => {
    const list = jobs || [];
    const today = new Date().toISOString().slice(0, 10);
    const st = (v) => (v || "").toLowerCase();
    const by = (name) => list.filter((j) => st(j.order_status) === name.toLowerCase()).length;
    return {
      today: list.filter((j) => (j.order_date || "").slice(0, 10) === today).length,
      designPending: by("Design Pending") + by("Design Approval"),
      production: by("Production"),
      ready: by("Ready"),
      delivered: by("Delivered"),
      pendingPay: list.filter((j) => st(j.payment_status) !== "yes" && st(j.order_status) !== "cancelled").length,
      overdue: list.filter((j) => j.delivery_date && String(j.delivery_date).slice(0, 10) < today && !["delivered", "cancelled"].includes(st(j.order_status))).length,
      newEnq: enquiries.filter((e) => (e.status || "") === "New Enquiry").length,
      total: list.length,
      pending: list.filter((j) => !["delivered", "cancelled"].includes(st(j.order_status))).length,
      byStage: ORDER_STATUS.filter((x) => x !== "Cancelled").map((stage) => ({ stage, count: by(stage) })),
    };
  }, [jobs, enquiries]);

  const maxStage = Math.max(1, ...s.byStage.map((x) => x.count));

  const reportRows = useMemo(() => {
    let list = jobs || [];
    if (rf.from) list = list.filter((j) => (j.order_date || "").slice(0, 10) >= rf.from);
    if (rf.to) list = list.filter((j) => (j.order_date || "").slice(0, 10) <= rf.to);
    if (rf.machine) list = list.filter((j) => (j.machine_type || "") === rf.machine);
    if (rf.work) list = list.filter((j) => (j.work_type || "") === rf.work);
    if (rf.status !== "All") list = list.filter((j) => (j.order_status || "") === rf.status);
    return list;
  }, [jobs, rf]);

  async function downloadExcel() {
    const XLSX = await import("xlsx");
    const rows = reportRows.map((j) => ({
      "Job ID": j.job_id,
      "Order Date": (j.order_date || "").slice(0, 10),
      "Customer": j.customer_name,
      "Mobile": j.mobile,
      "Product": j.product_category,
      "Quantity": j.quantity,
      "Work Type": j.work_type,
      "Machine Type": j.machine_type,
      "Designer": j.designer_name,
      "Design Status": j.design_status,
      "Production Status": j.production_status,
      "Delivery Status": j.delivery_status,
      "Order Status": j.order_status,
      "Priority": j.priority,
      "Delivery Date": j.delivery_date ? String(j.delivery_date).slice(0, 10) : "",
      "Payment": j.payment_status,
      "Notes": j.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs Report");
    // Write to a real file blob (reliable on all browsers, opens in Excel)
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NPC-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
            <div className="eyebrow">Today at a glance</div>
            <div className="stat-grid">
              <div className="stat-card" style={{ "--accent": "var(--ink)" }}><div className="stat-num">{s.today}</div><div className="stat-label">Today&apos;s orders</div></div>
              <div className="stat-card" style={{ "--accent": "var(--magenta)" }}><div className="stat-num">{s.designPending}</div><div className="stat-label">Design pending</div></div>
              <div className="stat-card" style={{ "--accent": "var(--cyan)" }}><div className="stat-num">{s.production}</div><div className="stat-label">Production pending</div></div>
              <div className="stat-card" style={{ "--accent": "var(--yellow)" }}><div className="stat-num">{s.ready}</div><div className="stat-label">Ready for delivery</div></div>
              <div className="stat-card" style={{ "--accent": "var(--red)" }}><div className="stat-num">{s.pendingPay}</div><div className="stat-label">Pending payment</div></div>
              <div className="stat-card" style={{ "--accent": "var(--red)" }}><div className="stat-num">{s.overdue}</div><div className="stat-label">Overdue deliveries</div></div>
              <div className="stat-card" style={{ "--accent": "var(--magenta)" }}><div className="stat-num">{s.newEnq}</div><div className="stat-label">New enquiries</div></div>
              <div className="stat-card" style={{ "--accent": "var(--key)" }}><div className="stat-num">{s.delivered}</div><div className="stat-label">Completed orders</div></div>
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Analytics</div>
            <div className="panel">
              <div className="h2">{s.delivered} completed · {s.pending} pending of {s.total} jobs</div>
              {s.byStage.map((x) => (
                <div className="bar-row" key={x.stage}>
                  <div className="bar-label">{x.stage}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(x.count / maxStage) * 100}%`, background: stageColorVar(x.stage) }} /></div>
                  <div className="bar-count">{x.count}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
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
              <Pie data={ORDER_STATUS.map((st) => ({
                label: st,
                count: reportRows.filter((j) => (j.order_status || "") === st).length,
                color: stageColorVar(st),
              }))} />
              <button className="btn-primary" onClick={downloadExcel} disabled={reportRows.length === 0}>Download Excel report</button>
            </div>
          </section>

          <section className="section">
            <div className="eyebrow">Recent jobs</div>
            {(jobs || []).slice(0, 6).map((j) => (
              <Link href={`/jobs/${j.job_id}`} className="list-row" key={j.job_id}>
                <div className="row-top">
                  <span className="job-id">{j.job_id}</span>
                  <span className={`pill ${stagePill(j.order_status)}`}><span className="dot" />{j.order_status}</span>
                </div>
                <div className="row-title">{j.customer_name}</div>
                <div className="row-sub">{[j.product_category, j.quantity && `Qty ${j.quantity}`].filter(Boolean).join(" · ")}</div>
              </Link>
            ))}
            {(jobs || []).length === 0 && <div className="empty">No jobs yet.</div>}
          </section>
        </>
      )}
    </Shell>
  );
}
