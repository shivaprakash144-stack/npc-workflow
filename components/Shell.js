"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ICONS = {
  dashboard: <path d="M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" />,
  enquiries: <path d="M21 11a8 8 0 1 0-3.3 6.5L21 19l-1-3.4A7.9 7.9 0 0 0 21 11ZM8 10h8M8 13h5" />,
  jobs: <path d="M4 7h16v13H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 12h16" />,
  production: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.06-.4.1-.8.1-1.2Z" />,
};

function tabsForRole(role) {
  if (role === "production") return [{ href: "/production", label: "Production", icon: "production" }];
  const base = [
    { href: "/enquiries", label: "Enquiries", icon: "enquiries" },
    { href: "/jobs", label: "Jobs", icon: "jobs" },
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
        <div className="topbar-inner">
          {back ? (
            <Link href={back} className="btn-ghost">← Back</Link>
          ) : (
            <div className="brand">
              <img src="/logo.png" alt="NPC — New Print Creations" className="brand-logo" />
              <div>
                <div className="brand-name">{title || "Workhub"}</div>
                <div className="brand-sub">Workhub</div>
              </div>
            </div>
          )}
          {back ? <div className="brand-sub">{title}</div> : (
            <button className="btn-ghost" onClick={logout}>Sign out</button>
          )}
        </div>
      </header>
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
