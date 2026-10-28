"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHead } from "@/components/ui";

type Kyc = { profile: Record<string, string>; status: string; gates: Record<string, { missing: string[]; allowed: boolean }> };
const questions = [
  ["dateOfBirth", "When were you born?", "YYYY-MM-DD"],
  ["residentialAddress", "Where do you live?", "Street, town and district"],
  ["occupation", "What is your occupation?", "For example, teacher"],
  ["idType", "Which identity document do you use?", "National ID or passport"],
  ["idNumber", "What is its number?", "As printed on your identity document"],
  ["idEvidenceReference", "Identity document evidence reference", "Reference from a secure upload"],
  ["addressEvidenceReference", "Address evidence reference", "Reference from a secure upload"],
  ["sourceOfFunds", "Where will your funds come from?", "For example, salary or business income"],
  ["pepDeclaration", "Do you hold a prominent public role?", "Yes, no, or details"],
  ["taxResidence", "Where are you tax resident?", "For example, Lesotho"],
  ["beneficialOwnershipDeclaration", "Are you acting for yourself?", "Yes, or who you represent"],
] as const;

export default function KycPage() {
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { api<Kyc>("/api/kyc").then(setKyc).catch((e) => setMessage(e instanceof Error ? e.message : "Could not load identity details.")); }, []);
  useEffect(() => { setValue(kyc?.profile[questions[index][0]] ?? ""); }, [kyc, index]);
  const [field, prompt, hint] = questions[index];
  async function next() {
    if (!value.trim()) { setMessage("Please answer this question to continue."); return; }
    setSaving(true); setMessage("");
    try {
      const saved = await api<{ profile: Record<string, string>; status: string }>("/api/kyc", { method: "PATCH", body: { field, value } });
      setKyc((current) => current ? { ...current, ...saved } : current);
      setIndex((current) => Math.min(current + 1, questions.length - 1));
      if (index === questions.length - 1) setMessage("Saved. Identity evidence must be reviewed before an account can be activated.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save this answer."); }
    finally { setSaving(false); }
  }
  return <>
    <PageHead title="Identity and profile" sub="Complete only what your next action needs." />
    <section className="panel" style={{ maxWidth: 640, padding: 24 }}>
      <p className="muted">{index + 1} of {questions.length} · {index < 5 ? "Basic" : index < 8 ? "Standard" : "Enhanced"}</p>
      <h2>{prompt}</h2>
      <label className="field"><span>{prompt}</span><input className="input" value={value} onChange={(event) => setValue(event.target.value)} placeholder={hint} /></label>
      {message && <div className="alert" role="status">{message}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        {index > 0 && <button className="btn secondary" onClick={() => setIndex(index - 1)}>Back</button>}
        <button className="btn" disabled={saving || !kyc} onClick={next}>{saving ? "Saving…" : index === questions.length - 1 ? "Save" : "Save and continue"}</button>
        <Link className="btn secondary" href="/accounts">Accounts</Link>
      </div>
      <p className="faint" style={{ marginTop: 24 }}>Status: {kyc?.status?.replaceAll("_", " ") ?? "Loading"}. Evidence references and declarations require a reviewer; they are not automatic proof of identity.</p>
    </section>
  </>;
}
