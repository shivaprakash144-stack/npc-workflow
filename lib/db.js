// Built-in database (Neon Postgres over HTTP — works on Vercel serverless).
import { neon } from "@neondatabase/serverless";

let schemaReady = false;

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database is not configured. Add DATABASE_URL in Vercel.");
  return neon(url);
}

export async function ensureSchema() {
  if (schemaReady) return;
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT DEFAULT '',
    company TEXT DEFAULT '',
    address TEXT DEFAULT '',
    gst TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS enquiries (
    enquiry_id TEXT PRIMARY KEY,
    customer_id TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    mobile TEXT DEFAULT '',
    product_type TEXT DEFAULT '',
    size_material TEXT DEFAULT '',
    quantity TEXT DEFAULT '',
    design_required TEXT DEFAULT 'No',
    ref_image TEXT DEFAULT '',
    est_price TEXT DEFAULT '',
    status TEXT DEFAULT 'New Enquiry',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await q`CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    enquiry_id TEXT DEFAULT '',
    customer_id TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    mobile TEXT DEFAULT '',
    product_category TEXT DEFAULT '',
    quantity TEXT DEFAULT '',
    price TEXT DEFAULT '',
    advance TEXT DEFAULT '',
    payment_status TEXT DEFAULT 'No',
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    priority TEXT DEFAULT 'Normal',
    order_status TEXT DEFAULT 'Design Pending',
    designer_name TEXT DEFAULT '',
    design_file TEXT DEFAULT '',
    design_status TEXT DEFAULT '',
    machine_type TEXT DEFAULT '',
    work_type TEXT DEFAULT '',
    production_status TEXT DEFAULT '',
    delivery_method TEXT DEFAULT '',
    courier_name TEXT DEFAULT '',
    tracking_number TEXT DEFAULT '',
    delivery_status TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  schemaReady = true;
}

// ---- Auto IDs ----
// Job IDs: J + 2-digit year + 6-digit running number, e.g. J26000001.
// In 2027 the prefix automatically becomes J27 and numbering restarts at 000001.
export async function nextJobId(q) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `J${yy}`;
  const rows = await q`SELECT job_id FROM jobs WHERE job_id LIKE ${prefix + "%"} ORDER BY job_id DESC LIMIT 1`;
  const n = rows.length ? parseInt(rows[0].job_id.slice(3), 10) + 1 : 1;
  return prefix + String(n).padStart(6, "0");
}

export async function nextEnquiryId(q) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `E${yy}`;
  const rows = await q`SELECT enquiry_id FROM enquiries WHERE enquiry_id LIKE ${prefix + "%"} ORDER BY enquiry_id DESC LIMIT 1`;
  const n = rows.length ? parseInt(rows[0].enquiry_id.slice(3), 10) + 1 : 1;
  return prefix + String(n).padStart(6, "0");
}

export async function nextCustomerId(q) {
  const rows = await q`SELECT customer_id FROM customers WHERE customer_id LIKE 'C%' ORDER BY customer_id DESC LIMIT 1`;
  const n = rows.length ? parseInt(rows[0].customer_id.slice(1), 10) + 1 : 1;
  return "C" + String(n).padStart(6, "0");
}
