# NPC Workflow Manager

Complete offline-operations software for a printing & customised gifts business. Everything lives **inside the app** (built-in database — no Google Sheets): Customers → Enquiry → Job Card → Design → Production → Delivery → Payment → Dashboard.

## Features

- **Staff login** — up to any number of username + password accounts (no OTP, no SMS/email services)
- **Customers** — database with Customer ID (C000001), name, mobile, company, address, GST
- **Enquiries** — Enquiry ID (E26000001), product type, size/material, qty, design required, reference image upload, estimated price; status dropdown: New Enquiry / Quote Sent / Confirmed / Cancelled; one-tap **Convert to job**
- **Job cards** — auto Job ID **J26000001** (prefix follows the year: J27… in 2027, numbering restarts); price, advance, delivery date, priority (Normal/Urgent), order status dropdown
- **Design dept** — designer name, design file upload (image/PDF), status: Designing / Sent to Customer / Correction / Approved
- **Production dept** — machine type, work type (Digital / Flex / Laser / UV / Gift printing), status: Printing / Finishing / Packing / Ready
- **Delivery** — Pickup/Courier, courier name, tracking number, status: Ready / Dispatched / Delivered
- **Payment** — Yes/No + auto balance calculation
- **Owner dashboard** — Today's orders, Design pending, Production pending, Ready for delivery, Pending payment, Overdue deliveries, New enquiries, Completed orders + stage-wise analytics + urgent jobs list
- Every status is a **dropdown** — staff just select, no typing errors

## Deploy (all free, no approvals)

### 1. GitHub
Unzip and upload the contents to a private GitHub repo (package.json at repo root).

### 2. Vercel project
vercel.com → Add New → Project → import the repo (Next.js auto-detected). **Don't deploy yet.**

### 3. Database (2 clicks)
In your Vercel project → **Storage** tab → **Create Database** → choose **Neon (Postgres)** → Continue → Create. Vercel automatically adds `DATABASE_URL` to your project. Free tier, no card needed. Tables are created automatically on first use.

### 4. Environment variables
Project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `SESSION_SECRET` | any long random string |
| `STAFF_USERS` | `username:password:role` triples, comma separated. Roles: `owner`, `manager` (full access + Dashboard/Reports), `staff` (Enquiries/Jobs/Production, no Dashboard), `production` (Production section only). Example: `owner:Pass1:owner,mgr:Pass2:manager,ravi:Pass3:staff,arun:Pass4:production`. Missing role = staff. |
| `DATABASE_URL` | already added by step 3 — don't touch |

To add/remove staff or change a password later: edit `STAFF_USERS` → Deployments → Redeploy.

### 5. Deploy
Deployments → Deploy (or push any commit). Open `https://<project>.vercel.app` on your phone → Add to Home Screen.

## Notes

- File uploads (reference images, design files) are stored in the database; keep them under **2 MB** each. For heavy design files, store the final print file on your computer/drive and upload a small preview here.
- Sessions last 30 days per device; sign out from the dashboard header.
- ID formats: Jobs `J<yy>000001`, Enquiries `E<yy>000001`, Customers `C000001`.
- WhatsApp/SMS notifications: planned next phase (needs Meta WhatsApp API or SMS provider — has approval processes, so it's kept out for now as requested).

## Run locally

```bash
npm install
# put DATABASE_URL, SESSION_SECRET, STAFF_USERS in .env.local
npm run dev
```

## v2 behaviour notes

- **Roles:** Dashboard + Reports visible only to owner/manager. `production` users see only the Production section (server-enforced).
- **Auto status:** Design "Approved" → Production · Production Printing/Finishing/Packing → Production · Production "Ready" → Ready · Delivery "Delivered" → Delivered. Payment auto-flips to "Yes" when Advance ≥ Price.
- **Auto flow:** every new job appears in the Production section immediately.
- **Reports:** Dashboard → Reports → filter by From/To date, machine type, work type, status → Download Excel (.xlsx).
- **Validation:** mandatory * fields; mobile must be exactly 10 digits for enquiries and jobs.
- **IDs:** unchanged — J26000001 / E26000001.

## v3 changes

- Payment is a manual Yes/No dropdown (default No at creation); Price and Advance fields removed everywhere including the Excel report.
- Product category and Work type dropdowns have an "Other" option that opens a text box for typing the details.
- Activity timestamps ("Jan 26, 07:25:54", Indian time) recorded on enquiry create/update, job creation, and every status/field change, with the username. Shown as an Activity list on the job detail page and inside the enquiry edit form.
- Reports: pie chart of jobs by status shown live as filters are applied; Excel download fixed (direct file blob).
- Production section: "✓ Complete" button per job — marks production Ready, logs it, and removes the job from the production list. Owner/manager can reopen it from the job detail page.
- Existing databases upgrade themselves automatically (new columns are added on first request).

## v5 changes

- Dashboard stat numbers are hyperlinks: tap any card and the matching orders/enquiries open on the dashboard itself (tap again or ✕ to close). New "Review pending" card added.
- Google review section on each job (active after Delivered): tick "Google review completed" — logged in Activity with time and user. "Ask for review on WhatsApp" one-tap message. Review Done/Pending badge on delivered jobs and a "Google Review" column in Excel.
- "Ready" notifications: one-tap "Send WhatsApp — order ready" and "Send SMS" buttons on Ready jobs (detail + list) with a pre-filled message to the customer's number. Fully-automatic sending would require Meta WhatsApp Business API / SMS DLT approval — deliberately avoided.
- "Download ALL job cards (Excel)" button on the dashboard — always contains every job automatically.
- Cancel/Reactivate is owner & manager only (hidden for others and blocked on the server).
- Job/Enquiry ID prefix now follows the Indian FINANCIAL year: J26 = Apr 1 2026 – Mar 31 2027; changes to J27 on April 1, 2027 (not Jan 1). Numbering restarts each FY.
- Jobs panel status filter made case/space-insensitive so Cancelled jobs always appear under the Cancelled chip.

## v8 changes

- Official NPC (New Print Creations) logo on the login page and app header; renamed to "Workhub".
- Helper/comment texts removed from all sections.
- Activity history and enquiry activity visible only to owner/manager.
- Desktop layout: wider content, wrapped filter chips (Cancelled always reachable without scrolling), floating centered dock on large screens.
- One active login per user: signing in on a new device signs the user out everywhere else.
- Jobs: "System (designer)" filter added. Enquiries: search bar for duplicate checking.
- Live Google Sheet mirror (optional): every job create/update rewrites the "Jobs" tab in your sheet. Setup: create a Google Sheet with a tab named "Jobs"; create/reuse a service account with Google Sheets API enabled (see section 2 of this README's original guide); share the sheet with the service account email as **Editor**; add GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY (and optional GOOGLE_SHEET_TAB=Jobs) in Vercel; redeploy.
