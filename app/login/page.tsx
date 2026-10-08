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
  const websiteSignIn = websiteSignInUrl(process.env.NEXT_PUBLIC_SIGN_IN_URL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(15000) });
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
    <form className="box" onSubmit={submit} >
      <span className="access-eyebrow">ONE CITIZEN. MANY POSSIBILITIES.</span><h2>Welcome to Citizen Bank</h2>
      {reasonNotice && <div className="alert info" role="status">{reasonNotice}</div>}
      <p><a href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizen-website-demo.vercel.app/"}>Back to Citizen Bank website</a></p>
      {websiteSignIn && (
        <p style={{ margin: "0 0 20px", fontSize: 14 }}>
          Already an investor or shareholder with a Citizen account?{" "}
          <a href={websiteSignIn} style={{ color: "var(--gold)", fontWeight: 600 }}>Sign in with your Citizen account</a>
        </p>
      )}

      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>Welcome back to Citizen Bank internet banking.</p>
      {error && <div className="alert err" role="alert"><p>{error}</p><button type="button" className="button" onClick={()=>setError(null)}>Edit details / retry</button><a href="/login">Start again</a><a href={process.env.NEXT_PUBLIC_WEBSITE_URL || "https://citizen-website-demo.vercel.app"}>Cancel · Website</a></div>}
      <label className="field"><span>Email</span><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field"><span>Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <AccessButtons />
      <button className="btn block" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>New to Citizen Bank? <a href="/register" style={{ color: "var(--gold)", fontWeight: 600 }}>Open an account</a></p>

      <p className="access-note"><a href={(process.env.NEXT_PUBLIC_HUB_URL || "https://citizen-hub-demo.vercel.app")+"/reset-password"}>Activate account / reset password</a></p>
      <DemoAccounts />
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