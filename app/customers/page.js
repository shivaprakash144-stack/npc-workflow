"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Text } from "@/components/Field";

const empty = { name: "", mobile: "", company: "", address: "", gst: "" };

export default function CustomersPage() {
  const router = useRouter();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/customers", { cache: "no-store" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    if (!res.ok) setError(data.error || "Could not load customers");
    else setList(data.customers);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim()) return setError("Customer name is required");
    setBusy(true);
    setError("");
    const res = await fetch("/api/customers", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { ...form, customer_id: editing } : form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save");
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    setToast(editing ? "Customer updated" : `Customer ${data.customer_id} added`);
    setTimeout(() => setToast(""), 2500);
    load();
  }

  const q = query.trim().toLowerCase();
  const filtered = (list || []).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || (c.mobile || "").includes(q) || (c.company || "").toLowerCase().includes(q)
  );

  return (
    <Shell title="Customers">
      {toast && <div className="toast">{toast}</div>}
      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

      {showForm && (
        <section className="section-card" style={{ marginTop: 16 }}>
          <div className="section-title"><span className="sec-dot" style={{ background: "var(--ink)" }} />{editing ? `Edit ${editing}` : "New customer"}</div>
          <div className="form-grid">
            <Field label="Customer name" full><Text value={form.name} onChange={(v) => set("name", v)} placeholder="Ramesh Kumar" /></Field>
            <Field label="Mobile"><Text value={form.mobile} onChange={(v) => set("mobile", v)} inputMode="numeric" placeholder="9840012345" /></Field>
            <Field label="Company"><Text value={form.company} onChange={(v) => set("company", v)} placeholder="Optional" /></Field>
            <Field label="Address" full><Text value={form.address} onChange={(v) => set("address", v)} placeholder="Optional" /></Field>
            <Field label="GST (optional)" full><Text value={form.gst} onChange={(v) => set("gst", v)} placeholder="33ABCDE1234F1Z5" /></Field>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn-secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(empty); }}>Cancel</button>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save customer"}</button>
          </div>
        </section>
      )}

      <section className="section">
        <div className="search-wrap">
          <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
          <input className="search-input" placeholder="Search name, mobile, or company" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {!list && <div className="spinner" />}
        {list && filtered.length === 0 && <div className="empty">No customers found. Add your first customer.</div>}
        {filtered.map((c) => (
          <div className="list-row" key={c.customer_id}>
            <div className="row-top">
              <span className="job-id">{c.customer_id}</span>
              <button className="btn-ghost" onClick={() => { setForm({ ...c }); setEditing(c.customer_id); setShowForm(true); window.scrollTo({ top: 0 }); }}>Edit</button>
            </div>
            <div className="row-title">{c.name}</div>
            <div className="row-sub">{[c.mobile, c.company, c.gst && `GST ${c.gst}`].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </section>

      {!showForm && (
        <button className="fab" onClick={() => { setForm(empty); setEditing(null); setShowForm(true); window.scrollTo({ top: 0 }); }}>+ New customer</button>
      )}
    </Shell>
  );
}
