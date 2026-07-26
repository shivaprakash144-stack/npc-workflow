"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { href: "/", label: "Dashboard", icon: <path d="M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" /> },
  { href: "/enquiries", label: "Enquiries", icon: <path d="M21 11a8 8 0 1 0-3.3 6.5L21 19l-1-3.4A7.9 7.9 0 0 0 21 11ZM8 10h8M8 13h5" /> },
  { href: "/jobs", label: "Jobs", icon: <path d="M4 7h16v13H4zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 12h16" /> },
  { href: "/customers", label: "Customers", icon: <path d="M16 19a4 4 0 0 0-8 0M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 19a4 4 0 0 0-3-3.9M17 5.3a3.5 3.5 0 0 1 0 6.4" /> },
];

export default function Shell({ title, children, back }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <>
      <header className="topbar">
        <div className="cmyk-strip" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="topbar-inner">
          {back ? (
            <Link href={back} className="btn-ghost">← Back</Link>
          ) : (
            <div className="brand">
              <div className="brand-mark">NPC</div>
              <div>
                <div className="brand-name">{title || "Order tracker"}</div>
                <div className="brand-sub">Prints &amp; gifts</div>
              </div>
            </div>
          )}
          {back ? <div className="brand-sub">{title}</div> : (
            <button className="btn-ghost" onClick={logout}>Sign out</button>
          )}
        </div>
      </header>
      <main className="shell">{children}</main>
      <nav className="tabbar">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
