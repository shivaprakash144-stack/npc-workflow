// Real-time mirror of ALL jobs into a Google Sheet ("Jobs" tab).
// Optional: only runs when GOOGLE_SHEET_ID + service account envs are set.
import { SignJWT, importPKCS8 } from "jose";

let tokenCache = { token: null, exp: 0 };

export function sheetConfigured() {
  return !!(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").replace(/^"|"$/g, "").trim();
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.exp > now + 60) return tokenCache.token;
  const key = await importPKCS8(rawKey, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email).setSubject(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error("Google token exchange failed");
  const data = await res.json();
  tokenCache = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return tokenCache.token;
}

const HEADERS = ["Job ID", "Order Date", "Customer", "Mobile", "Product", "Size", "Quantity", "Work Type", "Machine Type", "Designer", "Design Required", "Design Status", "Working File Link", "Production Status", "Delivery Status", "Order Status", "Priority", "Delivery Date", "Payment", "Google Review", "Cancel Reason", "Production Complete", "Last Updated", "Notes"];

// Rewrites the whole Jobs tab so the sheet always mirrors the app exactly.
export async function syncJobsToSheet(q) {
  if (!sheetConfigured()) return;
  try {
    const jobs = await q`SELECT * FROM jobs ORDER BY created_at DESC`;
    const rows = jobs.map((j) => [
      j.job_id, String(j.order_date || "").slice(0, 10), j.customer_name, j.mobile,
      j.product_category, j.size_material, j.quantity, j.work_type, j.machine_type, j.designer_name,
      j.design_required || "No",
      j.design_status, j.work_file_link || "", j.production_status, j.delivery_status, j.order_status, j.priority,
      j.delivery_date ? String(j.delivery_date).slice(0, 10) : "",
      j.payment_status,
      String(j.order_status).toLowerCase() === "delivered" ? (j.review_done ? "Done" : "Pending") : "",
      j.cancel_reason || "",
      j.production_complete ? "Yes" : "No",
      j.updated_at ? new Date(j.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
      j.notes,
    ].map((v) => (v === null || v === undefined ? "" : String(v))));

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const tab = process.env.GOOGLE_SHEET_TAB || "Jobs";
    const token = await getAccessToken();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
    await fetch(`${base}/values/${encodeURIComponent(tab)}:clear`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    await fetch(`${base}/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [HEADERS, ...rows] }),
    });
  } catch (e) {
    console.error("Sheet sync failed:", e.message);
  }
}

const ENQ_HEADERS = ["Enquiry ID", "Date", "Customer", "Mobile", "Product Category", "Size / Material", "Quantity", "Design Required", "Priority", "Enquiry Mode", "System", "Status", "Cancel Reason", "Last Updated"];

async function ensureTab(sheetId, tab, token) {
  // Create the tab if it doesn't exist yet.
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const meta = await fetch(`${base}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const titles = (meta.sheets || []).map((x) => x.properties.title);
  if (!titles.includes(tab)) {
    await fetch(`${base}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
    });
  }
}

// Rewrites the whole Enquiries tab so it always mirrors the app exactly.
export async function syncEnquiriesToSheet(q) {
  if (!sheetConfigured()) return;
  try {
    const enquiries = await q`SELECT enquiry_id, customer_name, mobile, product_type, size_material, quantity, design_required, priority, enquiry_mode, designer_name, status, cancel_reason, created_at, updated_at FROM enquiries ORDER BY created_at DESC`;
    const rows = enquiries.map((e) => [
      e.enquiry_id,
      e.created_at ? new Date(e.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
      e.customer_name, e.mobile, e.product_type, e.size_material, e.quantity,
      e.design_required, e.priority || "Normal", e.enquiry_mode || "", e.designer_name || "",
      e.status, e.cancel_reason || "",
      e.updated_at ? new Date(e.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
    ].map((v) => (v === null || v === undefined ? "" : String(v))));

    const sheetId = process.env.GOOGLE_SHEET_ID;
    const tab = process.env.GOOGLE_SHEET_ENQ_TAB || "Enquiries";
    const token = await getAccessToken();
    await ensureTab(sheetId, tab, token);
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
    await fetch(`${base}/values/${encodeURIComponent(tab)}:clear`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    await fetch(`${base}/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [ENQ_HEADERS, ...rows] }),
    });
  } catch (e) {
    console.error("Enquiry sheet sync failed:", e.message);
  }
}
