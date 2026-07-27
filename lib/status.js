// Order stage model shared by dashboard + order detail
export const STAGES = [
  "Design Pending",
  "Design Approval",
  "Production",
  "Ready",
  "Delivered",
];

export function stagePill(status) {
  switch ((status || "").toLowerCase()) {
    case "design pending":
    case "design approval":
      return "pill-magenta";
    case "production":
      return "pill-cyan";
    case "ready":
      return "pill-yellow";
    case "delivered":
      return "pill-key";
    case "cancelled":
      return "pill-red";
    default:
      return "pill-gray";
  }
}

export function stageColorVar(status) {
  switch ((status || "").toLowerCase()) {
    case "design pending":
    case "design approval":
      return "var(--magenta)";
    case "production":
      return "var(--cyan)";
    case "ready":
      return "var(--yellow)";
    case "delivered":
      return "var(--key)";
    case "cancelled":
      return "var(--red)";
    default:
      return "var(--ink-30)";
  }
}

export function stageIndex(status) {
  const i = STAGES.findIndex(
    (s) => s.toLowerCase() === (status || "").toLowerCase()
  );
  return i;
}

export function formatINR(value) {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!isFinite(n) || String(value).trim() === "") return value || "—";
  return "₹" + n.toLocaleString("en-IN");
}

// "Jan 26, 07:25:54" style timestamps in Indian time
export function formatStamp(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(iso || "");
  }
}
