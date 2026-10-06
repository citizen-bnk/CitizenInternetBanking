"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthHero from "@/components/AuthHero";

import AccessButtons from "@/components/AccessButtons";
import { loginReasonMessage, websiteSignInUrl } from "@/lib/sso";

function LoginForm() {
  const params = useSearchParams();
  const reasonNotice = loginReasonMessage(params.get("reason"));
  const websiteSignIn = websiteSignInUrl(process.env.NEXT_PUBLIC_SIGN_IN_URL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
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
    <form className="box" onSubmit={submit} noValidate>
      <h2>Welcome to Citizen Bank</h2>
      {reasonNotice && <div className="alert info" role="status">{reasonNotice}</div>}
      <AccessButtons />
      {websiteSignIn && (
        <p style={{ margin: "0 0 20px", fontSize: 14 }}>
          Already an investor or shareholder with a Citizen account?{" "}
          <a href={websiteSignIn} style={{ color: "var(--gold)", fontWeight: 600 }}>Sign in with your Citizen account</a>
        </p>
      )}
      <details><summary style={{cursor:"pointer",marginBottom:16}}>Use email and password</summary>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>Welcome back to Citizen Bank internet banking.</p>
      {error && <div className="alert err" role="alert">{error}</div>}
      <label className="field"><span>Email</span><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field"><span>Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button className="btn block" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>New to Citizen Bank? <a href="/register" style={{ color: "var(--gold)", fontWeight: 600 }}>Open an account</a></p>
      {process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN !== "false" && (
        <div className="tip" style={{ marginTop: 20 }}>
          <p>Demo profile: <button type="button" className="link" onClick={() => setEmail("palesa@demo.citizenbank.co.ls")}>palesa@demo.citizenbank.co.ls</button> — ask your administrator for the demo password.</p>
        </div>
      )}
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
