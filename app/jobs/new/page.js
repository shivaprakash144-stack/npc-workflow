"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, Text } from "@/components/Field";
import { PRODUCT_TYPES, PRIORITY, PAYMENT, WORK_TYPES, ORDER_STATUS } from "@/lib/options";

function NewJobForm() {
  const router = useRouter();
  const params = useSearchParams();
  const enquiryId = params.get("enquiry") || "";
  const [form, setForm] = useState({
    enquiry_id: enquiryId,
    customer_name: "",
    mobile: "",
    product_category: PRODUCT_TYPES[0],
    work_type: "",
    quantity: "",
    price: "",
    advance: "",
    payment_status: "No",
    delivery_date: "",
    priority: "Normal",
    order_status: "Design Pending",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetch("/api/customers", { cache: "no-store" })
      .then((r) => (r.status === 401 ? router.replace("/login") : r.json()))
      .then((d) => d && setCustomers(d.customers || []))
      .catch(() => {});
    if (enquiryId) {
      fetch("/api/enquiries", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          const e = (d.enquiries || []).find((x) => x.enquiry_id === enquiryId);
          if (e) {
            setForm((f) => ({
              ...f,
              customer_name: e.customer_name || "",
              mobile: e.mobile || "",
              product_category: e.product_type || PRODUCT_TYPES[0],
              quantity: e.quantity || "",
              price: e.est_price || "",
            }));
          }
        })
        .catch(() => {});
    }
  }, [enquiryId, router]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function pickCustomer(id) {
    const c = customers.find((x) => x.customer_id === id);
    if (c) setForm((f) => ({ ...f, customer_id: c.customer_id, customer_name: c.name, mobile: c.mobile || "" }));
  }

  async function create() {
    if (!form.customer_name.trim()) return setError("Customer name is required");
    setBusy(true);
    setError("");
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not create the job");
    router.replace(`/jobs/${data.job_id}`);
  }

  return (
    <Shell title="New job card" back="/jobs">
      <section className="section-card" style={{ marginTop: 16 }}>
        <div className="section-title"><span className="sec-dot" style={{ background: "var(--ink)" }} />Job card {enquiryId && <span className="pill pill-cyan">from {enquiryId}</span>}</div>
        <p className="muted" style={{ marginTop: 6 }}>The Job ID is created automatically (J26000001 format).</p>
        <div className="form-grid">
          {customers.length > 0 && (
            <Field label="Pick existing customer (optional)" full>
              <Select value="" onChange={pickCustomer} options={["", ...customers.map((c) => c.customer_id)]} />
            </Field>
          )}
          <Field label="Customer name" full><Text value={form.customer_name} onChange={(v) => set("customer_name", v)} placeholder="Ramesh Kumar" /></Field>
          <Field label="Mobile"><Text value={form.mobile} onChange={(v) => set("mobile", v)} inputMode="numeric" /></Field>
          <Field label="Product category"><Select value={form.product_category} onChange={(v) => set("product_category", v)} options={PRODUCT_TYPES} /></Field>
          <Field label="Work type"><Select value={form.work_type} onChange={(v) => set("work_type", v)} options={WORK_TYPES} /></Field>
          <Field label="Quantity"><Text value={form.quantity} onChange={(v) => set("quantity", v)} inputMode="numeric" /></Field>
          <Field label="Price (₹)"><Text value={form.price} onChange={(v) => set("price", v)} inputMode="numeric" /></Field>
          <Field label="Advance payment (₹)"><Text value={form.advance} onChange={(v) => set("advance", v)} inputMode="numeric" /></Field>
          <Field label="Payment status"><Select value={form.payment_status} onChange={(v) => set("payment_status", v)} options={PAYMENT} /></Field>
          <Field label="Delivery date"><input className="text-input" type="date" value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} /></Field>
          <Field label="Priority"><Select value={form.priority} onChange={(v) => set("priority", v)} options={PRIORITY} /></Field>
          <Field label="Order status"><Select value={form.order_status} onChange={(v) => set("order_status", v)} options={ORDER_STATUS} /></Field>
          <Field label="Notes" full><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Matte lamination, LED backlit…" /></Field>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn-primary" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create job card"}</button>
      </section>
    </Shell>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="spinner" />}>
      <NewJobForm />
    </Suspense>
  );
}
