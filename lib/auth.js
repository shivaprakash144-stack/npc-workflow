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
    const role = ROLES.includes((parts[2] || "").trim().toLowerCase())
      ? parts[2].trim().toLowerCase()
      : "staff";
    if (u === String(username || "").trim().toLowerCase() && p === String(password || "")) {
      return { user: u, role };
    }
  }
  return null;
}

export async function createSessionToken(user, role) {
  return new SignJWT({ user, role })
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

export async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySessionToken(token) : null;
}
