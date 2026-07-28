import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, SESSION_COOKIE, ROLE_COOKIE } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
const attempts = new Map();

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const key = String(username || "").toLowerCase();
    const now = Date.now();
    const recent = (attempts.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= 8) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes" }, { status: 429 });
    }
    const found = checkCredentials(username, password);
    if (!found) {
      recent.push(now);
      attempts.set(key, recent);
      return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
    }
    // One active login per user: registering this device signs out any other device
    const jti = randomUUID();
    try {
      await ensureSchema();
      const q = sql();
      await q`INSERT INTO sessions (username, token_id, created_at) VALUES (${found.user}, ${jti}, now())
        ON CONFLICT (username) DO UPDATE SET token_id=${jti}, created_at=now()`;
    } catch {}
    const token = await createSessionToken(found.user, found.role, jti);
    const res = NextResponse.json({ ok: true, user: found.user, role: found.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    // Readable role cookie for the UI (server still enforces everything)
    res.cookies.set(ROLE_COOKIE, found.role, {
      httpOnly: false, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
