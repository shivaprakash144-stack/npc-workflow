"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, Text, FileUpload, MultiSelect, SelectWithOther } from "@/components/Field";
import { ENQUIRY_STATUS, PRODUCT_TYPES, YES_NO, DESIGNERS, PRIORITY, ENQUIRY_MODE } from "@/lib/options";
import { formatStamp } from "@/lib/status";

const PER_PAGE = 50;
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const empty = {
  customer_name: "", mobile: "", product_type: "", size_material: "", quantity: "",
  design_required: "No", ref_image: "", status: "New Enquiry",
  designer_name: "", priority: "Normal", enquiry_mode: "",
};

export default function EnquiriesPage() {
  const router = useRouter();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("");
  const [prio, setPrio] = useState("All");
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("staff");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)npc_role=([^;]+)/);
    if (m) setRole(m[1]);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/enquiries", { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not load enquiries");
    else setList(data.enquiries);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    // Only name and mobile are mandatory
    if (!form.customer_name.trim()) return setError("Customer name is required");
    if (!/^\d{10}$/.test(form.mobile.trim())) return setError("Mobile number must be exactly 10 digits");
    setBusy(true);
    setError("");
    const res = await fetch("/api/enquiries", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { ...form, enquiry_id: editing } : form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save");
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    setToast(editing ? "Enquiry updated" : `Enquiry ${data.enquiry_id} created`);
    setTimeout(() => setToast(""), 2500);
    load();
  }

  function edit(e) {
    setForm({ ...empty, ...e });
    setEditing(e.enquiry_id);
    setShowForm(true);
    window.scrollTo({ top: 0 });
  }

  const q = query.trim().toLowerCase();

  // Base list: search + system filter applied (chip counts computed on this)
  const baseList = useMemo(() => {
    let l = list || [];
    // Default view: last 30 days of enquiries
    l = l.filter((e) => String(e.created_at || "").slice(0, 10) >= daysAgo(30));
    if (system) l = l.filter((e) => (e.designer_name || "") === system);
    if (prio !== "All") l = l.filter((e) => (e.priority || "Normal") === prio);
    if (q) {
      l = l.filter((e) =>
        (e.customer_name || "").toLowerCase().includes(q) ||
        (e.mobile || "").includes(q) ||
        (e.enquiry_id || "").toLowerCase().includes(q)
      );
    }
    return l;
  }, [list, q, system, prio]);

  const counts = useMemo(() => {
    const c = { All: baseList.length };
    for (const s of ENQUIRY_STATUS) c[s] = baseList.filter((e) => e.status === s).length;
    return c;
  }, [baseList]);

  const filtered = useMemo(() => {
    if (filter === "All") return baseList;
    return baseList.filter((e) => e.status === filter);
  }, [baseList, filter]);

  // Pagination: 30 per page
  useEffect(() => { setPage(1); }, [query, filter, system, prio]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Shell title="Enquiries">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

      {showForm && (
        <section className="section-card" style={{ marginTop: 16 }}>
          <div className="section-title"><span className="sec-dot" style={{ background: "var(--magenta)" }} />{editing ? `Edit ${editing}` : "New enquiry"}</div>
          <div className="form-grid">
            <Field label="Customer name *" full><Text value={form.customer_name} onChange={(v) => set("customer_name", v)} placeholder="Ramesh Kumar" /></Field>
            <Field label="Mobile (10 digits) *"><Text value={form.mobile} onChange={(v) => set("mobile", v.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="9840012345" /></Field>
            <Field label="Enquiry mode"><SelectWithOther value={form.enquiry_mode} onChange={(v) => set("enquiry_mode", v)} options={ENQUIRY_MODE} placeholder="Type the enquiry mode" /></Field>
            <Field label="Product type (select one or more)" full><MultiSelect value={form.product_type} onChange={(v) => set("product_type", v)} options={PRODUCT_TYPES} placeholder="Tap to select products" /></Field>
            <Field label="Size / material"><Text value={form.size_material} onChange={(v) => set("size_material", v)} placeholder="10x6 ft flex" /></Field>
            <Field label="Quantity"><Text value={form.quantity} onChange={(v) => set("quantity", v)} inputMode="numeric" placeholder="100" /></Field>
            <Field label="Design required"><Select value={form.design_required} onChange={(v) => set("design_required", v)} options={YES_NO} /></Field>
            <Field label="Priority"><Select value={form.priority} onChange={(v) => set("priority", v)} options={PRIORITY} /></Field>
            <Field label="System (designer)"><Select value={form.designer_name} onChange={(v) => set("designer_name", v)} options={DESIGNERS} /></Field>
            <Field label="Status" full><Select value={form.status} onChange={(v) => set("status", v)} options={ENQUIRY_STATUS} /></Field>
            <Field label="Reference image (optional, under 2 MB)" full>
              <FileUpload label="Upload reference image" value={form.ref_image} onChange={(v) => set("ref_image", v)} />
            </Field>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn-secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(empty); }}>Cancel</button>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save enquiry"}</button>
          </div>
          {editing && ["owner", "manager"].includes(role) && (() => {
            let h = [];
            try { h = JSON.parse(form.history || "[]"); } catch {}
            if (!Array.isArray(h) || h.length === 0) return null;
            return (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow">Activity</div>
                {[...h].reverse().map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 12.5 }}>
                    <span className="job-id" style={{ whiteSpace: "nowrap" }}>{formatStamp(e.at)}</span>
                    <span><b>{e.by}</b>{e.by ? " · " : ""}{e.text}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      <section className="section">
        <div className="search-wrap">
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input className="search-input" placeholder="Search name or mobile to check duplicates" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="form-grid" style={{ marginTop: 10 }}>
          <div className="full">
            <label className="f-label">System (designer)</label>
            <select value={system} onChange={(e) => setSystem(e.target.value)}>
              {DESIGNERS.map((d) => <option key={d || "all"} value={d}>{d === "" ? "All systems" : d}</option>)}
            </select>
          </div>
        </div>
        <div className="chip-row">
          {["All", ...ENQUIRY_STATUS].map((s) => (
            <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s} ({counts[s] ?? 0})</button>
          ))}
        </div>
        <div className="eyebrow" style={{ marginTop: 10 }}>Priority</div>
        <div className="chip-row">
          {["All", "Urgent", "Normal"].map((p) => (
            <button key={p} className={`chip ${prio === p ? "active" : ""}`} onClick={() => setPrio(p)}>
              {p} ({p === "All" ? baseList.length : baseList.filter((e) => (e.priority || "Normal") === p).length})
            </button>
          ))}
        </div>
        {!list && <div className="spinner" />}
        {list && filtered.length === 0 && <div className="empty">No enquiries here. Tap “New enquiry” to add the first one.</div>}
        {pageRows.map((e) => (
          <div className="list-row" key={e.enquiry_id}>
            <div className="row-top">
              <span className="job-id">{e.enquiry_id}</span>
              <span style={{ display: "flex", gap: 6 }}>
                {e.priority === "Urgent" && <span className="pill pill-urgent">Urgent</span>}
                <span className={`pill ${e.status === "Confirmed" ? "pill-key" : e.status === "Cancelled" ? "pill-red" : e.status === "Quote Sent" ? "pill-cyan" : "pill-magenta"}`}>{e.status}</span>
              </span>
            </div>
            <div className="row-title">{e.customer_name}</div>
            <div className="row-sub">{[e.product_type, e.size_material, e.quantity && `Qty ${e.quantity}`, e.designer_name, e.enquiry_mode].filter(Boolean).join(" · ")}</div>
            {e.updated_at && <div className="row-sub">Last updated {formatStamp(e.updated_at)}</div>}
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn-ghost" onClick={() => edit(e)}>Edit</button>
              {e.status !== "Cancelled" && (
                <Link className="btn-ghost" style={{ textAlign: "center" }} href={`/jobs/new?enquiry=${e.enquiry_id}`}>Convert to job →</Link>
              )}
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
      </section>

      {!showForm && (
        <button className="fab" onClick={() => { setForm(empty); setEditing(null); setShowForm(true); window.scrollTo({ top: 0 }); }}>+ New enquiry</button>
      )}
    </Shell>
  );
}
