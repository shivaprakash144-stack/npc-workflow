import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "npc_session";
export const ROLE_COOKIE = "npc_role";
export const ROLES = ["owner", "manager", "staff", "production"];

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

// ---- Password hashing (Node's built-in scrypt; no extra dependency) ----
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(test, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function normalizeRole(role) {
  let r = String(role || "").trim().toLowerCase();
  if (r === "admin") r = "owner"; // "admin" accepted as alias
  return ROLES.includes(r) ? r : "staff";
}

// STAFF_USERS=owner:Pass1:owner,manager:Pass2:manager,ravi:Pass3:staff,arun:Pass4:production
// This env var is now only a fallback / first-boot seed — accounts created or edited
// in the app itself (Menu → User accounts) live in the `users` DB table instead.
function checkEnvCredentials(username, password) {
  const raw = process.env.STAFF_USERS || "admin:admin123:owner";
  for (const entry of raw.split(",")) {
    const parts = entry.split(":");
    if (parts.length < 2) continue;
    const u = parts[0].trim().toLowerCase();
    const p = parts[1].trim();
    const role = normalizeRole(parts[2]);
    if (u === String(username || "").trim().toLowerCase() && p === String(password || "")) {
      return { user: u, role };
    }
  }
  return null;
}

// Checks the `users` table first (real source of truth once someone has logged in
// or an admin has set accounts up in-app); falls back to STAFF_USERS for any
// username not yet present in the DB, so nothing breaks right after deploy.
export async function checkCredentials(username, password) {
  const u = String(username || "").trim().toLowerCase();
  try {
    const { sql, ensureSchema } = await import("./db");
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT username, password_hash, role FROM users WHERE username=${u} AND active=true`;
    if (rows.length) {
      const row = rows[0];
      if (verifyPassword(password, row.password_hash)) {
        return { user: row.username, role: normalizeRole(row.role) };
      }
      return null; // username exists in DB but wrong password — don't fall through to env
    }
  } catch {
    // DB unreachable — fall back to env so login isn't fully blocked
  }
  return checkEnvCredentials(username, password);
}

export async function createSessionToken(user, role, jti) {
  return new SignJWT({ user, role, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload; // { user, role }
  } catch {
    return null;
  }
}

// Single active session per user: the newest login invalidates older devices.
export async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload) return null;
  // Owner and manager can stay logged in on multiple devices.
  if (["owner", "manager"].includes(payload.role)) return payload;
  try {
    const { sql, ensureSchema } = await import("./db");
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT token_id FROM sessions WHERE username=${payload.user}`;
    if (rows.length && rows[0].token_id !== payload.jti) return null; // logged in elsewhere
  } catch {
    // If the DB is briefly unreachable, don't lock everyone out
  }
  return payload;
}
