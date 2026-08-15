import { NextResponse } from "next/server";
import { requireSession, hashPassword, ROLES } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

function forbidden() {
  return NextResponse.json({ error: "Only the admin/owner can manage user accounts" }, { status: 403 });
}

export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (s.role !== "owner") return forbidden();
  try {
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT username, role, active, created_at, updated_at FROM users ORDER BY created_at ASC`;
    return NextResponse.json({ users: rows });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function POST(req) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (s.role !== "owner") return forbidden();
  try {
    await ensureSchema();
    const b = await req.json();
    const username = String(b.username || "").trim().toLowerCase();
    const password = String(b.password || "");
    const role = ROLES.includes(b.role) ? b.role : "staff";
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3-32 characters: letters, numbers, underscore only" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const q = sql();
    const existing = await q`SELECT username FROM users WHERE username=${username}`;
    if (existing.length) {
      return NextResponse.json({ error: "That username already exists" }, { status: 409 });
    }
    const hash = hashPassword(password);
    await q`INSERT INTO users (username, password_hash, role, active) VALUES (${username}, ${hash}, ${role}, true)`;
    return NextResponse.json({ ok: true, user: { username, role, active: true } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
