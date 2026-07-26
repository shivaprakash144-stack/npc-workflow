import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "npc_session";

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

// Staff accounts come from the STAFF_USERS env variable:
//   STAFF_USERS=ravi:pass123,kumar:pass456   (up to any number of users)
export function checkCredentials(username, password) {
  const raw = process.env.STAFF_USERS || "admin:admin123";
  for (const pair of raw.split(",")) {
    const i = pair.indexOf(":");
    if (i <= 0) continue;
    const u = pair.slice(0, i).trim().toLowerCase();
    const p = pair.slice(i + 1).trim();
    if (u === String(username || "").trim().toLowerCase() && p === String(password || "")) {
      return u;
    }
  }
  return null;
}

export async function createSessionToken(username) {
  return new SignJWT({ user: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

// For API routes: returns { user } or null
export async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySessionToken(token) : null;
}
