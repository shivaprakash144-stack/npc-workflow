"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Field, Select, Text } from "@/components/Field";

const ROLES = ["owner", "manager", "staff", "production"];
const ROLE_LABEL = { owner: "Owner", manager: "Manager", staff: "Staff", production: "Production" };

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editUser, setEditUser] = useState(null); // username string, or null

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.status === 401) return router.replace("/login");
      if (res.status === 403) return router.replace("/");
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Could not load user accounts");
      setUsers(data.users || []);
      setError("");
    } catch {
      setError("Network problem while loading");
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <>
      <Shell title="User accounts" back="/">
        <div className="section-card">
          <div className="section-title">User accounts</div>
          <div className="row-sub" style={{ marginTop: 4 }}>
            Add staff, production, and manager logins here — no need to touch Vercel settings anymore.
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

        <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setShowNew(true)}>
          + Add user
        </button>

        {users === null ? (
          <p className="muted" style={{ marginTop: 16 }}>Loading…</p>
        ) : users.length === 0 ? (
          <p className="muted" style={{ marginTop: 16 }}>No accounts yet.</p>
        ) : (
          users.map((u) => (
            <div key={u.username} className="list-row" style={{ opacity: u.active ? 1 : 0.55 }}>
              <div className="row-top">
                <div>
                  <div className="row-title">{u.username}</div>
                  <div className="row-sub">
                    {ROLE_LABEL[u.role] || u.role}{!u.active ? " · Deactivated" : ""}
                  </div>
                </div>
                <button className="btn-ghost" onClick={() => setEditUser(u.username)}>Edit</button>
              </div>
            </div>
          ))
        )}
      </Shell>

      {showNew && (
        <NewUserModal
          onClose={() => setShowNew(false)}
          onDone={(msg) => { setShowNew(false); flash(msg); load(); }}
        />
      )}
      {editUser && (
        <EditUserModal
          username={editUser}
          onClose={() => setEditUser(null)}
          onDone={(msg) => { setEditUser(null); flash(msg); load(); }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 70, display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: "18px 18px 0 0", padding: 18 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <button className="btn-ghost" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewUserModal({ onClose, onDone }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not create user"); setBusy(false); return; }
      onDone(`${username} added`);
    } catch {
      setError("Network problem. Try again");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Add user" onClose={onClose}>
      <Field label="Username">
        <Text value={username} onChange={setUsername} placeholder="e.g. production1" autoCapitalize="none" />
      </Field>
      <div className="row-sub" style={{ marginTop: -6, marginBottom: 10 }}>
        Letters, numbers, underscore only. For unit-scoped production logins use exactly:
        production1, production2, production3, or outsource.
      </div>
      <Field label="Password">
        <Text value={password} onChange={setPassword} type="password" placeholder="At least 6 characters" />
      </Field>
      <Field label="Role">
        <Select value={role} onChange={setRole} options={ROLES} />
      </Field>
      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
      <button className="btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={submit} disabled={busy}>
        {busy ? "Adding…" : "Add user"}
      </button>
    </ModalShell>
  );
}

function EditUserModal({ username, onClose, onDone }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("staff");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        const data = await res.json();
        const found = (data.users || []).find((u) => u.username === username);
        if (found) { setUser(found); setRole(found.role); }
      } catch {}
    })();
  }, [username]);

  async function patch(body, msg) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not update user"); setBusy(false); return; }
      onDone(msg);
    } catch {
      setError("Network problem. Try again");
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${username}? This can't be undone.`)) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${username}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not remove user"); setBusy(false); return; }
      onDone(`${username} removed`);
    } catch {
      setError("Network problem. Try again");
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <ModalShell title={username} onClose={onClose}>
        <p className="muted">Loading…</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={username} onClose={onClose}>
      <Field label="Role">
        <Select value={role} onChange={setRole} options={ROLES} />
      </Field>
      <button
        className="btn-ghost"
        style={{ marginBottom: 14 }}
        onClick={() => patch({ role }, "Role updated")}
        disabled={busy || role === user.role}
      >
        Save role
      </button>

      <Field label="Set a new password">
        <Text value={password} onChange={setPassword} type="password" placeholder="At least 6 characters" />
      </Field>
      <button
        className="btn-ghost"
        style={{ marginBottom: 14 }}
        onClick={() => patch({ password }, "Password changed")}
        disabled={busy || password.length < 6}
      >
        Save password
      </button>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 4 }}>
        {user.active ? (
          <button className="btn-ghost" onClick={() => patch({ active: false }, `${username} deactivated`)} disabled={busy}>
            Deactivate (block login, keep account)
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => patch({ active: true }, `${username} reactivated`)} disabled={busy}>
            Reactivate
          </button>
        )}
        <button className="btn-ghost" style={{ color: "var(--red)", display: "block", marginTop: 8 }} onClick={remove} disabled={busy}>
          Delete account
        </button>
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}
    </ModalShell>
  );
}
