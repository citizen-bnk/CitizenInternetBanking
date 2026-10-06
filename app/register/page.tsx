"use client";

import { useState } from "react";
import AuthHero from "@/components/AuthHero";

import AccessButtons from "@/components/AccessButtons";

export default function RegisterPage() {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, phone: f.phone || undefined }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "We couldn't open your account. Please try again.");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <AuthHero />
      <div className="auth-form">
        <form className="box" onSubmit={submit} noValidate>
          <h2>Start exploring</h2><AccessButtons /><details><summary>Create a profile with email instead</summary>
          <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>Your profile comes first. Complete account checks when you need them.</p>
          {error && <div className="alert err" role="alert">{error}</div>}
          <div className="row2">
            <label className="field"><span>First name</span><input className="input" autoComplete="given-name" value={f.firstName} onChange={set("firstName")} required /></label>
            <label className="field"><span>Last name</span><input className="input" autoComplete="family-name" value={f.lastName} onChange={set("lastName")} required /></label>
          </div>
          <label className="field"><span>Email</span><input className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} required /></label>
          <label className="field"><span>Mobile number</span><input className="input" type="tel" autoComplete="tel" placeholder="+266 5…" value={f.phone} onChange={set("phone")} /></label>
          <label className="field"><span>Password</span><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} required /></label>
          <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>At least 10 characters, with a letter and a number.</p>
          <button className="btn block" disabled={busy}>{busy ? "Creating your profile…" : "Open account"}</button>
          <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>Already with us? <a href="/login" style={{ color: "var(--gold)", fontWeight: 600 }}>Sign in</a></p>
        </details></form>
      </div>
    </main>
  );
}
