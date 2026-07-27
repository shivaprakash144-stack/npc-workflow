"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, Text, FileUpload } from "@/components/Field";
import { ENQUIRY_STATUS, PRODUCT_TYPES, YES_NO } from "@/lib/options";

const empty = { customer_name: "", mobile: "", product_type: PRODUCT_TYPES[0], size_material: "", quantity: "", design_required: "No", ref_image: "", est_price: "", status: "New Enquiry" };

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
    if (!form.customer_name.trim()) return setError("Customer name is required");
    if (!/^\d{10}$/.test(form.mobile.trim())) return setError("Mobile number must be exactly 10 digits");
    if (!form.product_type) return setError("Product type is required");
    if (!String(form.quantity).trim()) return setError("Quantity is required");
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
    setForm({ ...e });
    setEditing(e.enquiry_id);
    setShowForm(true);
    window.scrollTo({ top: 0 });
  }

  const filtered = (list || []).filter((e) => filter === "All" || e.status === filter);

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
            <Field label="Product type *"><Select value={form.product_type} onChange={(v) => set("product_type", v)} options={PRODUCT_TYPES} /></Field>
            <Field label="Size / material"><Text value={form.size_material} onChange={(v) => set("size_material", v)} placeholder="10x6 ft flex" /></Field>
            <Field label="Quantity *"><Text value={form.quantity} onChange={(v) => set("quantity", v)} inputMode="numeric" placeholder="100" /></Field>
            <Field label="Design required"><Select value={form.design_required} onChange={(v) => set("design_required", v)} options={YES_NO} /></Field>
            <Field label="Estimated price (₹)"><Text value={form.est_price} onChange={(v) => set("est_price", v)} inputMode="numeric" placeholder="1500" /></Field>
            <Field label="Status" full><Select value={form.status} onChange={(v) => set("status", v)} options={ENQUIRY_STATUS} /></Field>
            <Field label="Reference image (optional, under 2 MB)" full>
              <FileUpload label="Upload reference image" value={form.ref_image} onChange={(v) => set("ref_image", v)} />
            </Field>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn-secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(empty); }}>Cancel</button>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save enquiry"}</button>
          </div>
        </section>
      )}

      <section className="section">
        <div className="chip-row">
          {["All", ...ENQUIRY_STATUS].map((s) => (
            <button key={s} className={`chip ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        {!list && <div className="spinner" />}
        {list && filtered.length === 0 && <div className="empty">No enquiries here. Tap “New enquiry” to add the first one.</div>}
        {filtered.map((e) => (
          <div className="list-row" key={e.enquiry_id}>
            <div className="row-top">
              <span className="job-id">{e.enquiry_id}</span>
              <span className={`pill ${e.status === "Confirmed" ? "pill-key" : e.status === "Cancelled" ? "pill-red" : e.status === "Quote Sent" ? "pill-cyan" : "pill-magenta"}`}>{e.status}</span>
            </div>
            <div className="row-title">{e.customer_name}</div>
            <div className="row-sub">{[e.product_type, e.size_material, e.quantity && `Qty ${e.quantity}`, e.est_price && `₹${e.est_price}`].filter(Boolean).join(" · ")}</div>
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn-ghost" onClick={() => edit(e)}>Edit</button>
              {e.status !== "Cancelled" && (
                <Link className="btn-ghost" style={{ textAlign: "center" }} href={`/jobs/new?enquiry=${e.enquiry_id}`}>Convert to job →</Link>
              )}
            </div>
          </div>
        ))}
      </section>

      {!showForm && (
        <button className="fab" onClick={() => { setForm(empty); setEditing(null); setShowForm(true); window.scrollTo({ top: 0 }); }}>+ New enquiry</button>
      )}
    </Shell>
  );
}
