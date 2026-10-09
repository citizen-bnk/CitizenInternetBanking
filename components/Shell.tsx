"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useBank } from "@/lib/bank";
import { api } from "@/lib/api";
import { fmtDateTime, initials } from "@/lib/format";

const NAV_AI = [
  { href: "/", label: "Citizen AI", icon: "ai" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/transfers", label: "Transfers", icon: "transfer" },
  { href: "/payments", label: "Payments", icon: "payments" },
  { href: "/cards", label: "Cards", icon: "cards" },
  { href: "/insights", label: "Insights", icon: "insights" },
  { href: "/profile", label: "Profile", icon: "settings" },
];
const NAV_CLASSIC = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/accounts", label: "Accounts", icon: "wallet" },
  { href: "/transfers", label: "Transfers", icon: "transfer" },
  { href: "/payments", label: "Payments", icon: "payments" },
  { href: "/cards", label: "Cards", icon: "cards" },
  { href: "/loans", label: "Loans", icon: "loans" },
  { href: "/insights", label: "Financial Insights", icon: "insights" },
  { href: "/profile", label: "Profile", icon: "settings" },
];

type Notif = { id: string; title: string; body: string; read: boolean; createdAt: string };
const IDLE_LIMIT_MS = 10 * 60 * 1000;

function store(key: string, value?: string) {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value);
  } catch { /* storage unavailable — fine */ }
  return null;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, refresh } = useBank();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<null | "notif" | "profile">(null);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const [modePref, setModePref] = useState<string | null>(null);
  const classic = pathname === "/dashboard" || (pathname !== "/" && modePref === "classic");
  const nav = classic ? NAV_CLASSIC : NAV_AI;

  useEffect(() => { setCollapsed(store("cb_sidebar") === "collapsed"); }, []);
  useEffect(() => {
    if (pathname === "/") store("cb_mode", "ai");
    if (pathname === "/dashboard") store("cb_mode", "classic");
    setModePref(store("cb_mode"));
    setMobileOpen(false);
    setMenu(null);
  }, [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Sign out after 10 minutes without interaction.
  useEffect(() => {
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll"];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => { if (Date.now() - last > IDLE_LIMIT_MS) logout("timeout"); }, 20000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    store("cb_sidebar", next ? "collapsed" : "expanded");
  }
  async function logout(reason?: string) {
    await api("/api/auth/logout", { body: {} }).catch(() => {});
    window.location.replace(`/login${reason ? `?reason=${reason}` : ""}`);
  }
  async function openNotifs() {
    if (menu === "notif") return setMenu(null);
    setMenu("notif");
    const list = await api<Notif[]>("/api/notifications").catch(() => []);
    setNotifs(list);
    if (list.some((n) => !n.read)) api("/api/notifications", { body: {} }).then(refresh).catch(() => {});
  }
  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const routes: [RegExp, string][] = [
      [/card|freeze|limit|pin/, "/cards"], [/bill|electric|water|lec|wasco|dstv|airtime|data/, "/payments"],
      [/loan|borrow|calculat/, "/loans"], [/spend|insight|budget/, "/insights"], [/statement|account|balance|transaction/, "/accounts"],
      [/send|transfer|pay|beneficiar|international|abroad/, "/transfers"], [/setting|language|theme|profile|password/, "/settings"],
    ];
    const hit = routes.find(([re]) => re.test(q));
    router.push(hit ? hit[1] : `/?ask=${encodeURIComponent(search.trim())}`);
    setSearch("");
  }

  const u = data?.user;
  return (
    <div className={`shell${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <Link href={classic ? "/dashboard" : "/"} className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" />
          <span>citizen bank</span>
        </Link>
        <nav className="nav">
          {nav.map((n) => {
            const active = n.href === pathname || (n.href !== "/" && n.href !== "/dashboard" && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} className={`${active ? "active " : ""}${n.icon === "ai" ? "ai-link" : ""}`} title={collapsed ? n.label : undefined} aria-current={active ? "page" : undefined}>
                {n.icon === "ai" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/brand/logo.png" alt="" />
                ) : <Icon name={n.icon} />}
                <span className="label">{n.label}</span>
              </Link>
            );
          })}
          {classic && (
            <>
              <div className="nav-sep" />
              <Link href="/" className="ai-link" title={collapsed ? "Citizen Bank AI" : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo.png" alt="" />
                <span className="label">Citizen Bank AI</span>
                <span className="badge">New</span>
              </Link>
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <button className="mode-switch" onClick={() => router.push(classic ? "/" : "/dashboard")} title={collapsed ? (classic ? "Switch to Citizen AI" : "Switch to Classic Banking") : undefined}>
            <Icon name={classic ? "sparkle" : "monitor"} />
            <span className="label">
              {classic ? "Citizen AI" : "Classic Banking"}
              <small>{classic ? "Talk to your bank" : "Switch to classic"}</small>
            </span>
          </button>
          <button className="collapse-btn" onClick={toggleCollapse} aria-label={collapsed ? "Expand menu" : "Collapse menu"} aria-expanded={!collapsed}>
            <Icon name="collapse" size={20} />
            <span className="label">Collapse menu</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="Open menu"><Icon name="menu" size={20} /></button>
          <form className="search" onSubmit={onSearch} role="search">
            <Icon name="search" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for transactions, payments or help…" aria-label="Search" />
          </form>
          <div className="topbar-right" ref={menuRef} style={{ position: "relative" }}>
            <button className="icon-btn" onClick={openNotifs} aria-label="Notifications">
              <Icon name="bell" size={20} />
              {!!data?.unreadNotifications && <span className="count">{data.unreadNotifications}</span>}
            </button>
            <button className="profile-btn" onClick={() => setMenu(menu === "profile" ? null : "profile")} aria-haspopup="menu">
              <span className="avatar">{u ? initials(`${u.firstName} ${u.lastName}`) : ""}</span>
              <span className="who">
                <b>{u ? `${u.firstName} ${u.lastName}` : "…"}</b><br />
                <small>Personal Banking</small>
              </span>
            </button>
            {menu === "notif" && (
              <div className="dropdown" role="dialog" aria-label="Notifications">
                {!notifs && <div className="empty">Loading…</div>}
                {notifs?.length === 0 && <div className="empty">No notifications yet.</div>}
                {notifs?.map((n) => (
                  <div key={n.id} className="item">
                    {!n.read ? <span className="unread" /> : <span style={{ width: 8 }} />}
                    <div><b>{n.title}</b><small>{n.body}</small><small>{fmtDateTime(n.createdAt)}</small></div>
                  </div>
                ))}
              </div>
            )}
            {menu === "profile" && (
              <div className="dropdown" role="menu" style={{ width: 240 }}>
                <div className="item" style={{ cursor: "default" }}><div><b>{u?.firstName} {u?.lastName}</b><small>{u?.email}</small></div></div>
                <Link className="item" href="/profile#settings" role="menuitem"><Icon name="settings" size={18} /> Settings</Link>
                <button className="item" role="menuitem" onClick={() => logout()}><Icon name="logout" size={18} /> Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">
          <span className="legal-banner">
            © {new Date().getFullYear()} Citizen Digital Ltd (Reg. 99073) — applicant for a Central Bank of Lesotho banking licence. It does not hold a
            licence or carry on banking business; this is a pre-licensing demonstration of the proposed Citizen Bank.
          </span>
          <nav><Link href="/profile#settings">Security</Link><Link href="/profile#help">Help</Link></nav>
        </footer>
      </div>
      {mobileOpen && <div className="modal-bg" style={{ zIndex: 19, background: "rgba(3,1,12,.5)" }} onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
