import { NextResponse } from "next/server";
import { requireSession, hashPassword, ROLES } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

function forbidden() {
  return NextResponse.json({ error: "Only the admin or manager can manage user accounts" }, { status: 403 });
}

async function countActiveOwners(q, excludingUsername) {
  const rows = await q`SELECT COUNT(*)::int AS n FROM users WHERE role='owner' AND active=true AND username <> ${excludingUsername || ""}`;
  return rows[0]?.n || 0;
}

export async function PATCH(req, { params }) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!["owner", "manager"].includes(s.role)) return forbidden();
  const username = String(params.username || "").trim().toLowerCase();
  try {
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT username, role, active FROM users WHERE username=${username}`;
    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const current = rows[0];
    const b = await req.json();

    // Prevent removing the last active owner account (would lock everyone out of admin access).
    const demotingOrDeactivating =
      (b.role !== undefined && b.role !== "owner" && current.role === "owner") ||
      (b.active === false && current.role === "owner" && current.active);
    if (demotingOrDeactivating) {
      const remaining = await countActiveOwners(q, username);
      if (remaining < 1) {
        return NextResponse.json({ error: "Can't remove the last active admin account" }, { status: 400 });
      }
    }

    if (b.password !== undefined) {
      const password = String(b.password || "");
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      const hash = hashPassword(password);
      await q`UPDATE users SET password_hash=${hash}, updated_at=now() WHERE username=${username}`;
    }
    if (b.role !== undefined) {
      const role = ROLES.includes(b.role) ? b.role : current.role;
      await q`UPDATE users SET role=${role}, updated_at=now() WHERE username=${username}`;
    }
    if (b.active !== undefined) {
      await q`UPDATE users SET active=${!!b.active}, updated_at=now() WHERE username=${username}`;
      if (!b.active) {
        // Also kick any live session for this account immediately.
        await q`DELETE FROM sessions WHERE username=${username}`;
      }
    }
    const updated = await q`SELECT username, role, active, created_at, updated_at FROM users WHERE username=${username}`;
    return NextResponse.json({ ok: true, user: updated[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}

export async function DELETE(req, { params }) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!["owner", "manager"].includes(s.role)) return forbidden();
  const username = String(params.username || "").trim().toLowerCase();
  if (username === s.user) {
    return NextResponse.json({ error: "You can't delete the account you're signed in with" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const q = sql();
    const rows = await q`SELECT role, active FROM users WHERE username=${username}`;
    if (!rows.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (rows[0].role === "owner" && rows[0].active) {
      const remaining = await countActiveOwners(q, username);
      if (remaining < 1) {
        return NextResponse.json({ error: "Can't remove the last active admin account" }, { status: 400 });
      }
    }
    await q`DELETE FROM users WHERE username=${username}`;
    await q`DELETE FROM sessions WHERE username=${username}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
