import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const attempts = new Map(); // best-effort brute-force slowdown

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const key = String(username || "").toLowerCase();
    const now = Date.now();
    const recent = (attempts.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= 8) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes" }, { status: 429 });
    }
    const user = checkCredentials(username, password);
    if (!user) {
      recent.push(now);
      attempts.set(key, recent);
      return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
    }
    const token = await createSessionToken(user);
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
