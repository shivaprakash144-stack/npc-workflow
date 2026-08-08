"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ICONS = {
  dashboard: <path d="M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" />,
  enquiries: <path d="M21 11a8 8 0 1 0-3.3 6.5L21 19l-1-3.4A7.9 7.9 0 0 0 21 11ZM8 10h8M8 13h5" />,
  jobs: <path d="M4 7h16v13H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 12h16" />,
  customers: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  production: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.06-.4.1-.8.1-1.2Z" />,
};

function tabsForRole(role) {
  if (role === "production") return [{ href: "/production", label: "Production", icon: "production" }];
  const base = [
    { href: "/enquiries", label: "Enquiries", icon: "enquiries" },
    { href: "/jobs", label: "Jobs", icon: "jobs" },
    { href: "/customers", label: "Customers", icon: "customers" },
    { href: "/production", label: "Production", icon: "production" },
  ];
  if (role === "owner" || role === "manager") {
    return [{ href: "/", label: "Dashboard", icon: "dashboard" }, ...base];
  }
  return base;
}

export default function Shell({ title, children, back }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState("staff");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)npc_role=([^;]+)/);
    if (m) setRole(m[1]);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const tabs = tabsForRole(role);

  return (
    <>
      <header className="topbar">
        <div className="cmyk-strip" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="topbar-inner topbar-grid">
          <div className="tb-left">
            {back ? (
              <Link href={back} className="btn-ghost">← Back</Link>
            ) : pathname === "/" && ["owner", "manager"].includes(role) ? (
              <button className="btn-ghost" aria-label="Open menu" onClick={() => setMenuOpen(true)} style={{ fontSize: 18, lineHeight: 1, padding: "8px 12px" }}>☰</button>
            ) : null}
          </div>
          <div className="brand brand-center">
            <img src="/logo.png" alt="NPC — New Print Creations" className="brand-logo" />
            <div className="brand-name">Workhub</div>
          </div>
          <div className="tb-right">
            {back ? <span className="brand-sub">{title}</span> : (
              <button className="btn-ghost" onClick={logout}>Sign out</button>
            )}
          </div>
        </div>
      </header>
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 60 }}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, left: 0, bottom: 0, width: "min(320px, 85vw)",
              background: "#fff", overflowY: "auto", padding: "0 0 24px",
              boxShadow: "6px 0 24px rgba(0,0,0,.18)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Menu</div>
                <div className="muted" style={{ fontSize: 12 }}>Signed in as {role === "owner" ? "admin" : role}</div>
              </div>
              <button className="btn-ghost" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            <MenuGroup title="Quick actions">
              <MenuItem href="/jobs/new" onGo={() => setMenuOpen(false)}>+ New job card</MenuItem>
              <MenuItem href="/enquiries" onGo={() => setMenuOpen(false)}>+ New enquiry</MenuItem>
            </MenuGroup>

            <MenuGroup title="Sections">
              <MenuItem href="/" onGo={() => setMenuOpen(false)}>Dashboard</MenuItem>
              <MenuItem href="/enquiries" onGo={() => setMenuOpen(false)}>Enquiries</MenuItem>
              <MenuItem href="/jobs" onGo={() => setMenuOpen(false)}>Jobs</MenuItem>
              <MenuItem href="/customers" onGo={() => setMenuOpen(false)}>Customers</MenuItem>
              <MenuItem href="/production" onGo={() => setMenuOpen(false)}>Production</MenuItem>
            </MenuGroup>

            <MenuGroup title="Reports">
              <MenuItem href="/?reports=1" onGo={() => setMenuOpen(false)}>Jobs report (filters + Excel)</MenuItem>
              <MenuItem href="/customers" onGo={() => setMenuOpen(false)}>Customer report</MenuItem>
            </MenuGroup>

            <MenuGroup title="Account">
              <button
                className="btn-ghost"
                style={{ display: "block", width: "calc(100% - 36px)", margin: "6px 18px", textAlign: "left" }}
                onClick={() => { setMenuOpen(false); logout(); }}
              >Sign out</button>
            </MenuGroup>
          </nav>
        </div>
      )}
      <main className="shell">{children}</main>
      <nav className="tabbar" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICONS[t.icon]}</svg>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}


function MenuGroup({ title, children }) {
  return (
    <div style={{ padding: "14px 0 4px", borderBottom: "1px solid var(--line)" }}>
      <div className="eyebrow" style={{ padding: "0 18px 6px" }}>{title}</div>
      {children}
    </div>
  );
}

function MenuItem({ href, children, onGo }) {
  return (
    <Link
      href={href}
      onClick={onGo}
      style={{ display: "block", padding: "11px 18px", fontWeight: 600, fontSize: 14.5, color: "inherit", textDecoration: "none" }}
    >
      {children}
    </Link>
  );
}
