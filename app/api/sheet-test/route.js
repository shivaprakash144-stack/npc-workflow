// Google Sheet sync diagnostics (admin/manager only).
// Open /api/sheet-test in the browser while logged in — it checks every step
// and reports exactly where the sync breaks.
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { SignJWT, importPKCS8 } from "jose";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (!s || !["owner", "manager"].includes(s.role)) {
    return NextResponse.json({ error: "Admin or manager login required" }, { status: 403 });
  }

  const steps = [];
  const ok = (step, detail) => steps.push({ step, status: "OK", detail });
  const fail = (step, detail, hint) => {
    steps.push({ step, status: "FAILED", detail, hint });
    return NextResponse.json({ result: "SYNC BROKEN — see the failed step", steps }, { status: 200 });
  };

  // Step 1: env variables present?
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const tab = process.env.GOOGLE_SHEET_TAB || "Jobs";
  const missing = [
    !sheetId && "GOOGLE_SHEET_ID",
    !email && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    !rawKey && "GOOGLE_PRIVATE_KEY",
  ].filter(Boolean);
  if (missing.length) {
    return fail("1. Environment variables", `Missing: ${missing.join(", ")}`,
      "Add them in Vercel → Settings → Environment Variables, then Redeploy.");
  }
  ok("1. Environment variables", `All present. Service account: ${email}. Tab: "${tab}". Sheet ID: ${sheetId.slice(0, 8)}…`);

  // Step 2: private key parses?
  let key;
  try {
    const pem = rawKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    key = await importPKCS8(pem, "RS256");
    ok("2. Private key format", "Key parsed successfully.");
  } catch (e) {
    return fail("2. Private key format", e.message,
      "The key got mangled when pasting. In Vercel, paste the WHOLE value of private_key from the JSON file (including -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----). Literal \\n sequences are fine; surrounding quotes are not.");
  }

  // Step 3: Google accepts the credentials?
  let token;
  try {
    const now = Math.floor(Date.now() / 1000);
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
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return fail("3. Google login (token exchange)", JSON.stringify(data),
        "The service account email and private key don't match, or the service account was deleted. Re-download the JSON key from Google Cloud → IAM → Service Accounts and update both env variables.");
    }
    token = data.access_token;
    ok("3. Google login (token exchange)", "Google accepted the service account credentials.");
  } catch (e) {
    return fail("3. Google login (token exchange)", e.message, "Network or credential problem.");
  }

  // Step 4: can we open the spreadsheet? (checks ID + sharing + API enabled)
  let meta;
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    meta = await res.json();
    if (!res.ok) {
      const msg = meta?.error?.message || `HTTP ${res.status}`;
      const hint = res.status === 403
        ? `Share the Google Sheet with ${email} as EDITOR (Share button on the sheet, paste this email). Also ensure "Google Sheets API" is ENABLED in the Google Cloud project.`
        : res.status === 404
          ? "GOOGLE_SHEET_ID is wrong. Copy the long ID from the sheet URL between /d/ and /edit."
          : "Unexpected error.";
      return fail("4. Open the spreadsheet", msg, hint);
    }
    ok("4. Open the spreadsheet", `Found: "${meta.properties.title}"`);
  } catch (e) {
    return fail("4. Open the spreadsheet", e.message, "Network problem reaching Google Sheets.");
  }

  // Step 5: does the tab exist?
  const tabs = (meta.sheets || []).map((x) => x.properties.title);
  if (!tabs.includes(tab)) {
    return fail("5. Find the tab", `Tab "${tab}" not found. Tabs in this sheet: ${tabs.join(", ")}`,
      `Rename a tab to exactly "${tab}" (case-sensitive), or set GOOGLE_SHEET_TAB to one of the existing tab names and redeploy.`);
  }
  ok("5. Find the tab", `Tab "${tab}" exists.`);

  // Step 6: test write
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}!A1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [["Job ID"]] }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return fail("6. Test write", data?.error?.message || `HTTP ${res.status}`,
        `The service account can read but not write — set its sharing permission to EDITOR (not Viewer).`);
    }
    ok("6. Test write", "Wrote to A1 successfully. THE SYNC WORKS — save any job in the app and the sheet will fill.");
  } catch (e) {
    return fail("6. Test write", e.message, "Network problem.");
  }

  return NextResponse.json({ result: "ALL CHECKS PASSED ✓ — sheet sync is working", steps });
}
