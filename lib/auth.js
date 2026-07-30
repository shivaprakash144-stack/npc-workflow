import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "npc_session";
export const ROLE_COOKIE = "npc_role";
export const ROLES = ["owner", "manager", "staff", "production"];

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

// STAFF_USERS=owner:Pass1:owner,manager:Pass2:manager,ravi:Pass3:staff,arun:Pass4:production
// Role is optional; missing role = staff.
export function checkCredentials(username, password) {
  const raw = process.env.STAFF_USERS || "admin:admin123:owner";
  for (const entry of raw.split(",")) {
    const parts = entry.split(":");
    if (parts.length < 2) continue;
    const u = parts[0].trim().toLowerCase();
    const p = parts[1].trim();
    let role = (parts[2] || "").trim().toLowerCase();
    if (role === "admin") role = "owner"; // "admin" accepted as alias
    role = ROLES.includes(role) ? role : "staff";
    if (u === String(username || "").trim().toLowerCase() && p === String(password || "")) {
      return { user: u, role };
    }
  }
  return null;
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
