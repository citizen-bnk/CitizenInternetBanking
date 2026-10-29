"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Question = { field: string; question: string; hint: string; purpose: string };
type Prompt = { question: Question | null; remainingToday: number };

export default function ProfileQuestion({ userId, context, onSaved }: { userId: string; context: string; onSaved: () => Promise<void> }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [neverAsk, setNeverAsk] = useState(false);
  useEffect(() => { api<Prompt>(`/api/profile/prompt?context=${encodeURIComponent(context)}`).then(setPrompt).catch(() => {}); }, [userId, context]);
  const question = prompt?.question;
  if (!question) return null;
  async function answer() {
    setBusy(true); setError("");
    try {
      await api("/api/profile/prompt", { body: { action: "answer", field: question!.field, value } });
      await onSaved();
      setPrompt(await api<Prompt>(`/api/profile/prompt?context=${encodeURIComponent(context)}`));
      setValue("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your answer."); }
    finally { setBusy(false); }
  }
  async function defer() {
    try {
      await api("/api/profile/prompt", { body: { action: "defer" } });
      setPrompt(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your preference."); }
  }
  return <div className="modal-bg" style={{ zIndex: 100, display: "grid", placeItems: "center", padding: 20 }}>
    <section className="panel" role="dialog" aria-modal="true" aria-label="One profile question" style={{ width: "min(100%, 440px)", padding: 24 }}>
      <p className="muted">One quick profile question</p>
      <h2 style={{ marginBottom: 18 }}>{question.question}</h2>
      <label className="field"><span>{question.purpose}</span><input className="input" autoFocus value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") answer(); }} placeholder={question.hint} /></label>
      {error && <div className="alert err" role="alert">{error}</div>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
        <button className="btn" onClick={answer} disabled={busy || !value.trim()}>{busy ? "Saving…" : "Save answer"}</button>
        <button className="btn secondary" onClick={async () => {
          if (!neverAsk) return defer();
          try {
            await api("/api/profile/prompt", { body: { action: "suppress", field: question.field } });
            setPrompt(null);
          } catch (e) { setError(e instanceof Error ? e.message : "Could not save your preference."); }
        }}>{neverAsk ? "Don't ask again" : "Skip for now"}</button>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}><input type="checkbox" checked={neverAsk} onChange={(event) => setNeverAsk(event.target.checked)} /> Don’t ask me this question again</label>
      <p className="faint" style={{ marginTop: 16 }}>Optional · at most two questions today</p>
    </section>
  </div>;
}
