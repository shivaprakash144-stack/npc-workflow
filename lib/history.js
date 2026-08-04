// Activity timestamps — every change is logged with date + time (Asia/Kolkata on display).
export function entry(by, text) {
  return { at: new Date().toISOString(), by: by || "", text };
}

export function parseHistory(t) {
  try {
    const a = JSON.parse(t || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

// Compare old job row vs incoming update and describe every change.
export function jobChanges(oldJ, b, derivedStatus) {
  const ch = [];
  const track = [
    ["designer_name", "Designer"],
    ["design_status", "Design status"],
    ["machine_type", "Machine type"],
    ["work_type", "Work type"],
    ["production_status", "Production status"],
    ["delivery_status", "Delivery status"],
    ["payment_status", "Payment"],
    ["priority", "Priority"],
    ["product_category", "Product"],
    ["design_required", "Design required"],
    ["production_unit", "Production unit"],
  ];
  for (const [k, label] of track) {
    const o = String(oldJ[k] ?? "");
    const n = String(b[k] ?? "");
    if (o !== n) ch.push(`${label}: ${o || "—"} → ${n || "—"}`);
  }
  if (derivedStatus && String(oldJ.order_status) !== derivedStatus) {
    ch.push(`Job status: ${oldJ.order_status} → ${derivedStatus}`);
  }
  return ch;
}
