"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(e) {
    e?.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Enter your username and password");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Wrong username or password");
      else {
        router.replace("/");
        router.refresh();
      }
    } catch {
      setError("Network problem. Check your connection and try again");
    }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="cmyk-strip" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="login-inner">
          <div className="login-logo">NPC</div>
          <h1 className="login-title">Workflow manager</h1>
          <p className="login-sub">Enquiries, job cards, design, production &amp; delivery. Staff sign-in only.</p>

          <div className="field">
            <label className="f-label" htmlFor="user">Username</label>
            <input
              id="user"
              className="text-input"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="e.g. ravi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="f-label" htmlFor="pass">Password</label>
            <input
              id="pass"
              className="text-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
          </div>
          <button className="btn-primary" onClick={login} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {error && <div className="alert alert-error">{error}</div>}
        </div>
      </div>
      <p className="muted" style={{ marginTop: 18 }}>NPC Prints &amp; Gifts · Workflow manager</p>
    </div>
  );
}
