"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { PageHead, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { initials } from "@/lib/format";

type Branch = { id: string; name: string; address: string; city: string; hours: string | null; distanceKm: number | null };

export default function SettingsPage() {
  const { data, refresh } = useBank();
  const [phone, setPhone] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);
  if (!data) return <div className="grid"><Skeleton h={60} /><Skeleton h={300} /></div>;
  const u = data.user;

  async function save(patch: Record<string, string>) {
    setMsg(null);
    try {
      await api("/api/me", { method: "PATCH", body: patch });
      if (patch.preferredTheme) document.documentElement.setAttribute("data-theme", patch.preferredTheme);
      await refresh();
      setMsg({ ok: true, text: "Saved." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." });
    }
  }
  function findBranches() {
    const load = (q = "") => api<Branch[]>(`/api/branches${q}`).then(setBranches).catch(() => setBranches([]));
    if (!navigator.geolocation) return load();
    navigator.geolocation.getCurrentPosition((p) => load(`?lat=${p.coords.latitude}&lng=${p.coords.longitude}`), () => load(), { timeout: 8000 });
  }

  return (
    <>
      <PageHead title="Settings" sub="Your profile, preferences and security." />
      {msg && <div className={`alert ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Profile</h2><a href="/profile">Manage all Citizen roles</a></div>
          <div className="row" style={{ borderBottom: 0 }}>
            <span className="avatar" style={{ width: 56, height: 56, fontSize: 18 }}>{initials(`${u.firstName} ${u.lastName}`)}</span>
            <span className="grow"><span className="title" style={{ fontSize: 17 }}>{u.firstName} {u.lastName}</span><span className="sub">{u.email}</span></span>
          </div>
          <label className="field"><span>Mobile number (used for airtime)</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="tel" value={phone ?? u.phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
              <button className="btn secondary" onClick={() => phone !== null && save({ phone })}>Save</button>
            </div>
          </label>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Preferences</h2></div>
          <div className="field"><span>Citizen AI language</span>
            <div className="pill-group">
              {[["en", "English"], ["st", "Sesotho"], ["zu", "isiZulu"]].map(([k, l]) => (
                <button key={k} className={u.preferredLanguage === k ? "active" : ""} onClick={() => save({ preferredLanguage: k })}>{l}</button>
              ))}
            </div>
            <span className="hint">Sesotho and isiZulu replies are machine translations pending review by native speakers.</span>
          </div>
          <div className="field"><span>Appearance</span>
            <div className="pill-group">
              <button className={u.preferredTheme !== "light" ? "active" : ""} onClick={() => save({ preferredTheme: "dark" })}><Icon name="moon" size={14} /> Dark</button>
              <button className={u.preferredTheme === "light" ? "active" : ""} onClick={() => save({ preferredTheme: "light" })}><Icon name="sun" size={14} /> Light</button>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Security</h2></div>
          <div className="list">
            <div className="row"><span className="ico"><Icon name="lock" size={20} /></span><span className="grow"><span className="title">Automatic sign-out</span><span className="sub">Signed out after 10 minutes of inactivity (5 on mobile).</span></span><span className="chip ok">On</span></div>
            <div className="row"><span className="ico"><Icon name="shield" size={20} /></span><span className="grow"><span className="title">Payment confirmation</span><span className="sub">Every payment — including ones Citizen AI prepares — needs your confirmation.</span></span><span className="chip ok">On</span></div>
            <div className="row"><span className="ico"><Icon name="bell" size={20} /></span><span className="grow"><span className="title">Transaction alerts</span><span className="sub">You&apos;re notified when money arrives or a scheduled payment fails.</span></span><span className="chip ok">On</span></div>
          </div>
          <button className="btn danger" style={{ marginTop: 14 }} onClick={async () => { await api("/api/auth/logout", { body: {} }).catch(() => {}); window.location.replace("/login"); }}>
            <Icon name="logout" size={16} /> Log out
          </button>
        </section>
        <section className="panel" id="help">
          <div className="panel-head"><h2>Help &amp; branches</h2></div>
          <p className="muted" style={{ marginTop: 0 }}>Citizen AI can answer most questions. For disputes or fraud, visit a branch and our team will help you in person.</p>
          <button className="btn secondary" onClick={findBranches}><Icon name="pin" size={16} /> Find my nearest branch</button>
          <div className="list" style={{ marginTop: 12 }}>
            {branches?.map((b) => (
              <div key={b.id} className="row">
                <span className="ico"><Icon name="pin" size={18} /></span>
                <span className="grow"><span className="title">{b.name}</span><span className="sub">{b.address}, {b.city}{b.hours ? ` · ${b.hours}` : ""}</span></span>
                {b.distanceKm !== null && <span className="faint">{b.distanceKm} km</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
