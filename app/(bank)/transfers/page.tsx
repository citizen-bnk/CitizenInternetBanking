"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Modal, PageHead, SecureNote, Skeleton } from "@/components/ui";
import { api, newIdem } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { fmtDay, fuzzy, initials, money, parseAmount } from "@/lib/format";
import type { Account, Beneficiary, Overview } from "@/lib/types";

type Tab = "citizen" | "local" | "international" | "own";
const TABS: { key: Tab; label: string }[] = [
  { key: "citizen", label: "Citizen to Citizen" },
  { key: "local", label: "Local Bank" },
  { key: "international", label: "International" },
  { key: "own", label: "Own Account" },
];
const TYPE_FOR_TAB: Record<string, Beneficiary["type"]> = { citizen: "CITIZEN", local: "LOCAL", international: "INTERNATIONAL" };

function fee(data: Overview, kind: "CITIZEN" | "LOCAL" | "INTERNATIONAL" | "OWN", amount: number) {
  if (kind === "LOCAL") return data.fees.localTransferCents / 100;
  if (kind === "INTERNATIONAL") return Math.max(data.fees.intlMinCents / 100, Math.round(amount * data.fees.intlPercent) / 100);
  return 0;
}

function AccountSelect({ accounts, value, onChange, label, exclude }: { accounts: Account[]; value: string; onChange: (v: string) => void; label: string; exclude?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {accounts.filter((a) => a.id !== exclude).map((a) => (
          <option key={a.id} value={a.id}>{a.name} (•••• {a.last4}) — {money(a.balance)} available</option>
        ))}
      </select>
    </label>
  );
}

function AddBeneficiary({ data, tab, initial, onDone, onClose }: {
  data: Overview; tab: Tab; initial: { name?: string; bank?: string; account?: string }; onDone: (id: string) => void; onClose: () => void;
}) {
  const banks = tab === "citizen" ? ["Citizen Bank"] : data.localBanks.filter((b) => b !== "Citizen Bank");
  const [name, setName] = useState(initial.name ?? "");
  const [bank, setBank] = useState(initial.bank && banks.includes(initial.bank) ? initial.bank : banks[0]);
  const [acct, setAcct] = useState(initial.account ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api<{ beneficiary: { id: string } }>("/api/beneficiaries", { body: { name, bankName: bank, accountNumber: acct.replace(/\s/g, "") } });
      onDone(r.beneficiary.id);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't save."); setBusy(false); }
  }
  return (
    <Modal title="New beneficiary" onClose={onClose}>
      <form onSubmit={save}>
        {err && <div className="alert err">{err}</div>}
        <label className="field"><span>Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
        <label className="field"><span>Bank</span>
          <select className="select" value={bank} onChange={(e) => setBank(e.target.value)}>{banks.map((b) => <option key={b}>{b}</option>)}</select>
        </label>
        <label className="field"><span>Account number</span><input className="input" inputMode="numeric" value={acct} onChange={(e) => setAcct(e.target.value)} required /></label>
        <div className="foot"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{busy ? "Saving…" : "Save beneficiary"}</button></div>
      </form>
    </Modal>
  );
}

function Transfers() {
  const { data, refresh } = useBank();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "citizen");
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [benId, setBenId] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [startDate, setStartDate] = useState("");
  const [frequency, setFrequency] = useState("ONCE");
  const [intl, setIntl] = useState({ country: "ZA", name: "", bank: "", account: "", swift: "" });
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reference?: string; scheduled?: boolean } | null>(null);
  const idem = useRef(newIdem());
  const prefilled = useRef(false);

  const spendable = useMemo(() => data?.accounts.filter((a) => a.type !== "FIXED_DEPOSIT") ?? [], [data]);

  // Apply pre-fill from Citizen AI (query string) once data is available.
  useEffect(() => {
    if (!data || prefilled.current) return;
    prefilled.current = true;
    const acct = (n: string | null) => (n ? fuzzy(data.accounts, n, (a) => a.name) : undefined);
    const f = acct(params.get("from")) ?? spendable[0];
    setFrom(f?.id ?? "");
    const t = acct(params.get("to")) ?? data.accounts.find((a) => a.id !== f?.id);
    setTo(t?.id ?? "");
    const amt = params.get("amount"); if (amt && parseAmount(amt) > 0) setAmount(String(parseAmount(amt)));
    const b = params.get("beneficiary"); if (b && data.beneficiaries.some((x) => x.id === b)) setBenId(b);
    const name = params.get("name");
    if ((params.get("tab") === "international")) {
      const c = fuzzy(data.crossBorderCountries, params.get("country") ?? "", (x) => x.name) ?? fuzzy(data.crossBorderCountries, params.get("country") ?? "", (x) => x.code);
      const saved = name ? data.beneficiaries.find((x) => x.type === "INTERNATIONAL" && fuzzy([x], name, (y) => y.name)) : undefined;
      if (saved) setBenId(saved.id);
      setIntl((s) => ({ ...s, country: c?.code ?? s.country, name: saved ? "" : name ?? "", account: params.get("account") ?? "" }));
    } else if (name && !b) {
      const match = fuzzy(data.beneficiaries, name, (x) => x.name);
      if (match) { setBenId(match.id); setTab(match.type === "LOCAL" ? "local" : match.type === "INTERNATIONAL" ? "international" : "citizen"); }
      else setAdding(true);
    }
    if (params.get("add") === "1") {
      const bank = params.get("bank");
      if (bank && !/citizen/i.test(bank)) setTab("local");
      setAdding(true);
    }
  }, [data, params, spendable]);

  if (!data) return <div className="grid"><Skeleton h={60} /><Skeleton h={420} /></div>;

  const kind = tab === "own" ? "OWN" : tab === "international" ? "INTERNATIONAL" : tab === "local" ? "LOCAL" : "CITIZEN";
  const ben = data.beneficiaries.find((b) => b.id === benId && (tab === "own" || b.type === TYPE_FOR_TAB[tab]));
  const list = data.beneficiaries.filter((b) => b.type === TYPE_FOR_TAB[tab] && (!search || b.name.toLowerCase().includes(search.toLowerCase())));
  const amt = parseAmount(amount);
  const f = fee(data, kind, amt || 0);
  const fromAcc = data.accounts.find((a) => a.id === from);
  const toAcc = data.accounts.find((a) => a.id === to);
  const country = data.crossBorderCountries.find((c) => c.code === intl.country);

  function switchTab(t: Tab) {
    setTab(t); setStep("form"); setErr(null); setBenId(null); setSearch("");
    router.replace(`/transfers?tab=${t}`, { scroll: false });
  }

  function validate(): string | null {
    if (!(amt > 0)) return "Enter an amount greater than zero.";
    if (!fromAcc) return "Choose the account to pay from.";
    if (tab === "own") { if (!toAcc || toAcc.id === fromAcc.id) return "Choose two different accounts."; }
    else if (tab === "international") {
      if (!ben && (intl.name.trim().length < 2 || intl.bank.trim().length < 2 || !/^[A-Za-z0-9 ]{6,34}$/.test(intl.account.trim()))) return "Enter the recipient's name, bank and account number / IBAN.";
    } else if (!ben) return "Choose a recipient, or add a new beneficiary.";
    if (when === "now" && amt + f > Number(fromAcc.balance)) return `Your ${fromAcc.name} has ${money(fromAcc.balance)} available — that's not enough for ${money(amt + f)}.`;
    if (when === "later" && !startDate) return "Choose the date for the scheduled payment.";
    if (when === "now" && amt > data!.dailyLimit) return `That's above your daily limit of ${money(data!.dailyLimit)}.`;
    return null;
  }

  async function confirm() {
    setBusy(true); setErr(null);
    try {
      let res: { reference?: string } = {};
      if (when === "later" && ben) {
        await api("/api/scheduled", { body: { fromAccountId: from, beneficiaryId: ben.id, amount: amt, frequency, startDate: new Date(`${startDate}T08:00:00`).toISOString(), reference: reference || undefined } });
        setResult({ scheduled: true });
      } else {
        if (tab === "own") res = await api("/api/transfers/internal", { idem: idem.current, body: { fromAccountId: from, toAccountId: to, amount: amt } });
        else if (tab === "international" && !ben) res = await api("/api/payments/cross-border", { idem: idem.current, body: { fromAccountId: from, amount: amt, country: intl.country, recipientName: intl.name.trim(), bankName: intl.bank.trim(), accountNumber: intl.account.replace(/\s/g, ""), swift: intl.swift || undefined } });
        else res = await api("/api/payments/beneficiary", { idem: idem.current, body: { fromAccountId: from, beneficiaryId: ben!.id, amount: amt, reference: reference || undefined } });
        setResult({ reference: res.reference });
      }
      setStep("done");
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The transfer didn't go through. Nothing was charged.");
    } finally { setBusy(false); }
  }

  function reset() {
    idem.current = newIdem();
    setStep("form"); setAmount(""); setReference(""); setResult(null); setErr(null); setWhen("now");
  }

  const recipientLabel = tab === "own" ? `${toAcc?.name} (•••• ${toAcc?.last4})`
    : ben ? `${ben.name} — ${ben.bankName} (•••• ${ben.accountLast4})` : `${intl.name} — ${intl.bank} (•••• ${intl.account.slice(-4)})`;

  /* ---------------------------------------------------------- receipt */
  if (step === "done") {
    return (
      <>
        <PageHead title={result?.scheduled ? "Payment scheduled" : "Transfer sent"} />
        <div className="panel receipt" style={{ maxWidth: 560 }}>
          <div className="tick"><Icon name="check" size={38} stroke={2.4} /></div>
          <h2>{result?.scheduled ? `${money(amt)} scheduled` : `${money(amt)} sent`}</h2>
          <p className="muted">To {recipientLabel}{result?.scheduled ? `, starting ${fmtDay(`${startDate}T08:00:00`)} (${frequency.toLowerCase()})` : ""}.</p>
          {result?.reference && <p>Reference <b>{result.reference}</b></p>}
          {kind === "INTERNATIONAL" && !result?.scheduled && <p className="faint">International transfers usually arrive within 1–2 business days.</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
            <button className="btn secondary" onClick={reset}>Make another transfer</button>
            <Link className="btn" href="/accounts">View accounts</Link>
          </div>
        </div>
      </>
    );
  }

  /* ----------------------------------------------------------- review */
  if (step === "review") {
    return (
      <>
        <PageHead title="Review Transfer" sub="Please confirm the details below." back={() => setStep("form")} />
        {err && <div className="alert err">{err}</div>}
        <div className="split">
          <section className="panel">
            <div className="panel-head"><h2>Transfer summary</h2></div>
            <div className="summary">
              <div className="line"><span>From</span><span>{fromAcc?.name} (•••• {fromAcc?.last4})</span></div>
              <div className="line"><span>To</span><span>{recipientLabel}</span></div>
              <div className="line"><span>Amount</span><span className="num">{money(amt)}</span></div>
              {kind === "INTERNATIONAL" && country && <div className="line"><span>They receive (approx.)</span><span className="num">{(amt * country.rate).toLocaleString("en-US", { maximumFractionDigits: 2 })} {country.currency}</span></div>}
              <div className="line"><span>Transfer fee</span><span className="num">{money(f)}</span></div>
              {reference && <div className="line"><span>Reference</span><span>{reference}</span></div>}
              <div className="line"><span>When</span><span>{when === "now" ? "Now" : `${fmtDay(`${startDate}T08:00:00`)} · ${frequency.toLowerCase()}`}</span></div>
              <div className="line total"><span>Total</span><span className="num">{money(amt + f)}</span></div>
            </div>
          </section>
          <section className="secure-card">
            <div className="shield"><Icon name="shield" size={48} stroke={1.5} /></div>
            <h2>Secure &amp; protected</h2>
            <p className="muted" style={{ margin: 0 }}>This transfer is protected with bank-grade security. It only goes through when you confirm.</p>
          </section>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn ghost" onClick={() => setStep("form")} disabled={busy}>Cancel</button>
          <button className="btn" onClick={confirm} disabled={busy}>{busy ? "Sending…" : when === "later" ? "Confirm schedule" : "Confirm Transfer"}</button>
        </div>
      </>
    );
  }

  /* ------------------------------------------------------------- form */
  return (
    <>
      <PageHead title="Transfers" sub="Send money to anyone, anywhere." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "active" : ""} onClick={() => switchTab(t.key)}>{t.label}</button>)}
      </div>
      {err && <div className="alert err">{err}</div>}
      <div className="split">
        {tab !== "own" && (
          <section className="panel">
            <div className="panel-head">
              <h2>Recipient</h2>
              {tab !== "international" && <button className="link" onClick={() => setAdding(true)}>+ New beneficiary</button>}
            </div>
            <label className="search-in"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search beneficiaries" aria-label="Search beneficiaries" /></label>
            {list.map((b) => (
              <div key={b.id} className={`row clickable${ben?.id === b.id ? " selected" : ""}`} onClick={() => setBenId(ben?.id === b.id ? null : b.id)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setBenId(b.id)}>
                <span className="avatar">{initials(b.name)}</span>
                <span className="grow"><span className="title">{b.name}</span><span className="sub">{b.bankName}{b.country ? ` · ${b.country}` : ""}</span></span>
                <span className="faint num">•••• {b.accountLast4}</span>
              </div>
            ))}
            {!list.length && <div className="empty">{search ? "No matches." : tab === "international" ? "No saved international recipients yet — enter one on the right." : "No beneficiaries yet."}</div>}
          </section>
        )}

        <section className="panel" style={tab === "own" ? { maxWidth: 620 } : undefined}>
          <div className="panel-head"><h2>Transfer details</h2></div>
          <AccountSelect accounts={spendable} value={from} onChange={setFrom} label="From account" />
          {tab === "own" && <AccountSelect accounts={data.accounts} value={to} onChange={setTo} label="To account" exclude={from} />}

          {tab === "international" && !ben && (
            <>
              <label className="field"><span>Country</span>
                <select className="select" value={intl.country} onChange={(e) => setIntl({ ...intl, country: e.target.value })}>
                  {data.crossBorderCountries.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>)}
                </select>
              </label>
              <div className="row2">
                <label className="field"><span>Recipient name</span><input className="input" value={intl.name} onChange={(e) => setIntl({ ...intl, name: e.target.value })} /></label>
                <label className="field"><span>Bank</span><input className="input" value={intl.bank} onChange={(e) => setIntl({ ...intl, bank: e.target.value })} /></label>
              </div>
              <div className="row2">
                <label className="field"><span>Account number / IBAN</span><input className="input" value={intl.account} onChange={(e) => setIntl({ ...intl, account: e.target.value })} /></label>
                <label className="field"><span>SWIFT / BIC (optional)</span><input className="input" value={intl.swift} onChange={(e) => setIntl({ ...intl, swift: e.target.value.toUpperCase() })} maxLength={11} /></label>
              </div>
            </>
          )}
          {tab === "international" && ben && <div className="alert info">Sending to saved recipient <b>{ben.name}</b>. <button className="link" onClick={() => setBenId(null)}>Use a new recipient</button></div>}

          <label className="field"><span>Amount</span>
            <div className="amount-input"><b>M</b><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" aria-label="Amount in maloti" /></div>
          </label>
          <div className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
            {f > 0 ? `Fee ${money(f)}` : "No fee"}
            {kind === "INTERNATIONAL" && country && amt > 0 ? ` · they receive ≈ ${(amt * country.rate).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${country.currency}` : ""}
          </div>
          {tab !== "own" && tab !== "international" && (
            <>
              <label className="field"><span>Reference (optional)</span><input className="input" value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Rent, Stokvel" /></label>
              <label className="field"><span>When</span>
                <select className="select" value={when} onChange={(e) => setWhen(e.target.value as "now" | "later")}>
                  <option value="now">Now</option><option value="later">Schedule for later / recurring</option>
                </select>
              </label>
              {when === "later" && (
                <div className="row2">
                  <label className="field"><span>Start date</span><input className="input" type="date" value={startDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartDate(e.target.value)} /></label>
                  <label className="field"><span>Repeat</span>
                    <select className="select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                      <option value="ONCE">Once</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option>
                    </select>
                  </label>
                </div>
              )}
            </>
          )}
          <button className="btn block" onClick={() => { const v = validate(); setErr(v); if (!v) setStep("review"); }}>Review transfer</button>
          <SecureNote />
        </section>
      </div>

      {adding && tab !== "own" && tab !== "international" && (
        <AddBeneficiary data={data} tab={tab} initial={{ name: params.get("name") ?? undefined, bank: params.get("bank") ?? undefined, account: params.get("account") ?? undefined }}
          onClose={() => setAdding(false)} onDone={async (id) => { setAdding(false); await refresh(); setBenId(id); }} />
      )}
    </>
  );
}

export default function Page() {
  return <Suspense><Transfers /></Suspense>;
}
