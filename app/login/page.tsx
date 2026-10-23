"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthHero from "@/components/AuthHero";

import DemoAccounts from "@/components/DemoAccounts";
import AccessButtons from "@/components/AccessButtons";
import { loginReasonMessage, websiteSignInUrl } from "@/lib/sso";

function LoginForm() {
  const params = useSearchParams();
  const reasonNotice = loginReasonMessage(params.get("reason"));
  const centralSignIn = websiteSignInUrl(process.env.NEXT_PUBLIC_SIGN_IN_URL)
    ?? "https://hub.citizenbank.co.ls/api/platform/handoff?audience=banking";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(45000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Sign-in failed. Please try again.");
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <form className="box" onSubmit={submit}>
      <span className="access-eyebrow">ONE CITIZEN. MANY POSSIBILITIES.</span>
      <h2>Welcome to Citizen Bank</h2>
      {reasonNotice && <div className="alert info" role="status">{reasonNotice}</div>}
      <p><a href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizenbank.co.ls/"}>Back to Citizen Bank website</a></p>

      <section className="central-sign-in">
        <p className="muted">Your customer profile is managed through one Citizen identity shared with the mobile app and Citizen Hub.</p>
        <a className="button primary full" href={centralSignIn}>Continue with your Citizen account</a>
        <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>New to Citizen? <a href="/register" style={{ color: "var(--gold)", fontWeight: 600 }}>Create your Citizen account</a></p>
      </section>

      {error && (
        <div className="alert err" role="alert">
          <p>{error}</p>
          <button type="button" className="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <details
        open={legacyOpen || Boolean(error)}
        onToggle={(event) => setLegacyOpen(event.currentTarget.open)}
      >
        <summary>Existing banking credentials or demo access</summary>
        <p className="muted">Use this option for an existing Core banking login, an enrolled passkey or a demonstration profile. New sign-ups should start with your Citizen account above.</p>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <AccessButtons />
        <button className="btn block" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in with existing banking credentials"}</button>
        <p className="access-note"><a href={(process.env.NEXT_PUBLIC_HUB_URL || "https://hub.citizenbank.co.ls") + "/reset-password"}>Activate account / reset password</a></p>
        <DemoAccounts />
      </details>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth">
      <AuthHero />
      <div className="auth-form"><Suspense><LoginForm /></Suspense></div>
    </main>
  );
}
