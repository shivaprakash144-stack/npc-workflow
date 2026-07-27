// Automatic status engine: each department's saved details drive the job status.
export function deriveOrderStatus(j) {
  const d = (v) => String(v || "");
  if (d(j.delivery_status) === "Delivered") return "Delivered";
  if (d(j.production_status) === "Ready" || ["Ready", "Dispatched"].includes(d(j.delivery_status))) return "Ready";
  if (["Printing", "Finishing", "Packing"].includes(d(j.production_status))) return "Production";
  if (d(j.design_status) === "Approved") return "Production";
  if (["Sent to Customer", "Correction"].includes(d(j.design_status))) return "Design Approval";
  return "Design Pending";
}

// Payment auto: Yes only when advance covers the full price.
export function derivePayment(price, advance) {
  const p = Number(String(price).replace(/[^0-9.]/g, "")) || 0;
  const a = Number(String(advance).replace(/[^0-9.]/g, "")) || 0;
  return p > 0 && a >= p ? "Yes" : "No";
}

export function isValidMobile(m) {
  return /^\d{10}$/.test(String(m || "").trim());
}
