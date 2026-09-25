"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Modal, PageHead, SecureNote, Skeleton } from "@/components/ui";
import { api, newIdem } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { fmtDateTime, fmtDay, fuzzy, money, parseAmount } from "@/lib/format";
import type { Biller, Entry } from "@/lib/types";

const CATS: { key: string; label: string; icon: string }[] = [
  { key: "ELECTRICITY", label: "Electricity", icon: "bolt" },
  { key: "WATER", label: "Water", icon: "drop" },
  { key: "TV", label: "TV & Streaming", icon: "tv" },
  { key: "GOVERNMENT", label: "Government", icon: "gov" },
  { key: "EDUCATION", label: "Education", icon: "edu" },
  { key: "INSURANCE", label: "Insurance", icon: "heart" },
  { key: "AIRTIME", label: "Airtime & Data", icon: "phone" },
  { key: "SCHEDULED", label: "Scheduled", icon: "calendar" },
];
type Tab = "bills" | "airtime" | "scheduled";
type Pending = { title: string; lines: [string, string][]; run: () => Promise<{ reference?: string }> };

function Payments() {
  const { data, refresh } = useBank();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "bills");
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [biller, setBiller] = useState<Biller | null>(null);
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [network, setNetwork] = useState<string>("");
  const [number, setNumber] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Entry[] | null>(null);
  const [sched, setSched] = useState({ payee: "", amount: "", frequency: "MONTHLY", start: "", reference: "" });
  const idem = useRef(newIdem());
  const prefilled = useRef(false);

  const spendable = useMemo(() => data?.accounts.filter((a) => a.type !== "FIXED_DEPOSIT") ?? [], [data]);
  const bills = useMemo(() => data?.billers.filter((b) => !b.isAirtime) ?? [], [data]);
  const networks = useMemo(() => data?.billers.filter((b) => b.isAirtime) ?? [], [data]);

  useEffect(() => {
    if (!data || prefilled.current) return;
    prefilled.current = true;
    setFrom(spendable[0]?.id ?? "");
    setNumber(data.user.phone ?? "");
    setNetwork(networks[0]?.id ?? "");
    const b = params.get("biller"); if (b) { const m = fuzzy(bills, b, (x) => x.name) ?? fuzzy(bills, b, (x) => x.code); if (m) { setBiller(m); setCat(m.category); } }
    const n = params.get("network"); if (n) { const m = fuzzy(networks, n, (x) => x.name); if (m) setNetwork(m.id); }
    const num = params.get("number"); if (num && num !== "My number") setNumber(num);
    const a = params.get("amount"); if (a && parseAmount(a) > 0) setAmount(String(parseAmount(a)));
    const r = params.get("reference"); if (r) setRef(r);
  }, [data, params, spendable, bills, networks]);

  useEffect(() => {
    api<Entry[]>("/api/transactions?limit=100").then((l) => setRecent(l.filter((e) => e.type === "BILL_PAYMENT" || e.type === "AIRTIME").slice(0, 6))).catch(() => setRecent([]));
  }, [data?.recent?.[0]?.id]);

  if (!data) return <div className="grid"><Skeleton h={60} /><Skeleton h={420} /></div>;
  const fromAcc = data.accounts.find((a) => a.id === from);

  function go(t: Tab) { setTab(t); setErr(null); setDone(null); router.replace(`/payments?tab=${t}`, { scroll: false }); }
  function pickCat(k: string) {
    if (k === "AIRTIME") return go("airtime");
    if (k === "SCHEDULED") return go("scheduled");
    setCat(cat === k ? null : k); setBiller(null);
  }
  const shown = bills.filter((b) => (!cat || b.category === cat) && (!q || b.name.toLowerCase().includes(q.toLowerCase())));

  function review(kind: "bill" | "airtime") {
    setErr(null); setDone(null);
    const amt = parseAmount(amount);
    if (!(amt > 0)) return setErr("Enter an amount greater than zero.");
    if (!fromAcc) return setErr("Choose an account to pay from.");
    if (amt > Number(fromAcc.balance)) return setErr(`Your ${fromAcc.name} only has ${money(fromAcc.balance)} available.`);
    if (kind === "bill") {
      if (!biller) return setErr("Choose who you're paying.");
      if (ref.trim().length < 3) return setErr(`Enter your ${biller.refLabel.toLowerCase()}.`);
      setPending({
        title: "Confirm bill payment",
        lines: [["Pay", biller.name], [biller.refLabel, ref.trim()], ["From", `${fromAcc.name} (•••• ${fromAcc.last4})`], ["Amount", money(amt)]],
        run: () => api("/api/payments/bill", { idem: idem.current, body: { fromAccountId: from, billerId: biller.id, amount: amt, customerRef: ref.trim() } }),
      });
    } else {
      const net = networks.find((n) => n.id === network);
      if (!net) return setErr("Choose a network.");
      if (!/^\+?[0-9 ]{8,15}$/.test(number.trim())) return setErr("Enter a valid phone number.");
      if (amt < 5 || amt > 1000) return setErr("Airtime can be between M5 and M1,000.");
      setPending({
        title: "Confirm airtime",
        lines: [["Network", net.name], ["Phone number", number.trim()], ["From", `${fromAcc.name} (•••• ${fromAcc.last4})`], ["Amount", money(amt)]],
        run: () => api("/api/payments/airtime", { idem: idem.current, body: { fromAccountId: from, billerId: net.id, amount: amt, phone: number.trim() } }),
      });
    }
  }
  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      const r = await pending.run();
      setDone(`${pending.lines[pending.lines.length - 1][1]} paid successfully${r.reference ? ` — reference ${r.reference}` : ""}.`);
      setPending(null); setAmount(""); idem.current = newIdem();
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed. Nothing was charged.");
      setPending(null);
    } finally { setBusy(false); }
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setDone(null);
    const [kind, id] = sched.payee.split(":");
    const amt = parseAmount(sched.amount);
    if (!id) return setErr("Choose who to pay.");
    if (!(amt > 0)) return setErr("Enter an amount greater than zero.");
    if (!sched.start) return setErr("Choose a start date.");
    setBusy(true);
    try {
      await api("/api/scheduled", { body: {
        fromAccountId: from, amount: amt, frequency: sched.frequency, startDate: new Date(`${sched.start}T08:00:00`).toISOString(),
        beneficiaryId: kind === "ben" ? id : undefined, billerId: kind === "bill" ? id : undefined, reference: sched.reference || undefined,
      }});
      setDone("Scheduled payment created.");
      setSched({ payee: "", amount: "", frequency: "MONTHLY", start: "", reference: "" });
      refresh();
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't schedule that."); } finally { setBusy(false); }
  }
  async function cancelSchedule(id: string) {
    if (!window.confirm("Cancel this scheduled payment?")) return;
    await api(`/api/scheduled/${id}`, { method: "DELETE" }).then(refresh).catch((e) => setErr(e.message));
  }

  const FromSelect = (
    <label className="field"><span>Pay from</span>
      <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>
        {spendable.map((a) => <option key={a.id} value={a.id}>{a.name} (•••• {a.last4}) — {money(a.balance)}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <PageHead title="Payments Hub" sub="Pay bills, buy airtime and manage scheduled payments." />
      <div className="tabs" role="tablist">
        {(["bills", "airtime", "scheduled"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => go(t)}>
            {t === "bills" ? "Pay bills" : t === "airtime" ? "Airtime & data" : `Scheduled (${data.scheduled.length})`}
          </button>
        ))}
      </div>
      {err && <div className="alert err">{err}</div>}
      {done && <div className="alert ok">{done}</div>}

      <div className="split" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,0.9fr)" }}>
        <div className="grid" style={{ alignContent: "start" }}>
          {tab === "bills" && (
            <>
              <section className="panel">
                <label className="search-in"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a biller or merchant" aria-label="Search billers" /></label>
                <div className="panel-head"><h2>Payment categories</h2></div>
                <div className="cats">
                  {CATS.map((c) => (
                    <button key={c.key} className={`cat${cat === c.key ? " active" : ""}`} onClick={() => pickCat(c.key)}><Icon name={c.icon} />{c.label}</button>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-head"><h2>{biller ? `Pay ${biller.name}` : cat ? CATS.find((c) => c.key === cat)?.label : "All billers"}</h2>{biller && <button className="link" onClick={() => setBiller(null)}>Change</button>}</div>
                {!biller ? (
                  <div className="list">
                    {shown.map((b) => (
                      <div key={b.id} className="row clickable" onClick={() => { setBiller(b); setErr(null); }} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setBiller(b)}>
                        <span className="ico"><Icon name={CATS.find((c) => c.key === b.category)?.icon ?? "bill"} size={20} /></span>
                        <span className="grow"><span className="title">{b.name}</span><span className="sub">{b.refLabel}</span></span>
                        <Icon name="chevron" size={16} className="faint" />
                      </div>
                    ))}
                    {!shown.length && <div className="empty">No billers match.</div>}
                  </div>
                ) : (
                  <div>
                    <label className="field"><span>{biller.refLabel}</span><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={40} /></label>
                    <label className="field"><span>Amount</span><div className="amount-input"><b>M</b><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div></label>
                    {FromSelect}
                    <button className="btn block" onClick={() => review("bill")}>Review payment</button>
                    <SecureNote />
                  </div>
                )}
              </section>
            </>
          )}

          {tab === "airtime" && (
            <section className="panel">
              <div className="panel-head"><h2>Buy airtime</h2></div>
              <div className="field"><span>Network</span>
                <div className="pill-group">{networks.map((n) => <button key={n.id} className={network === n.id ? "active" : ""} onClick={() => setNetwork(n.id)}>{n.name.replace(/ (Telecom )?Lesotho$/, "")}</button>)}</div>
              </div>
              <label className="field"><span>Phone number</span><input className="input" type="tel" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+266 5…" /></label>
              <div className="field"><span>Amount</span>
                <div className="pill-group" style={{ marginBottom: 10 }}>{[10, 20, 50, 100].map((v) => <button key={v} className={parseAmount(amount) === v ? "active" : ""} onClick={() => setAmount(String(v))}>M{v}</button>)}</div>
                <div className="amount-input"><b>M</b><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Custom amount" /></div>
              </div>
              {FromSelect}
              <button className="btn block" onClick={() => review("airtime")}>Buy airtime</button>
              <SecureNote />
            </section>
          )}

          {tab === "scheduled" && (
            <>
              <section className="panel">
                <div className="panel-head"><h2>Upcoming scheduled payments</h2></div>
                <div className="list">
                  {data.scheduled.map((s) => (
                    <div key={s.id} className="row">
                      <span className="ico"><Icon name="calendar" size={20} /></span>
                      <span className="grow"><span className="title">{s.description}</span>
                        <span className="sub">{s.frequency.toLowerCase()} · next {fmtDay(s.nextRunAt)}{s.lastError ? ` · last attempt failed: ${s.lastError}` : ""}</span></span>
                      <span className="amt num">{money(s.amount)}</span>
                      <button className="btn danger small" onClick={() => cancelSchedule(s.id)}>Cancel</button>
                    </div>
                  ))}
                  {!data.scheduled.length && <div className="empty">No scheduled payments.</div>}
                </div>
              </section>
              <section className="panel">
                <div className="panel-head"><h2>New scheduled payment</h2></div>
                <form onSubmit={createSchedule}>
                  <label className="field"><span>Pay</span>
                    <select className="select" value={sched.payee} onChange={(e) => setSched({ ...sched, payee: e.target.value })}>
                      <option value="">Choose a beneficiary or biller…</option>
                      <optgroup label="Beneficiaries">{data.beneficiaries.map((b) => <option key={b.id} value={`ben:${b.id}`}>{b.name}</option>)}</optgroup>
                      <optgroup label="Billers">{bills.map((b) => <option key={b.id} value={`bill:${b.id}`}>{b.name}</option>)}</optgroup>
                    </select>
                  </label>
                  <div className="row2">
                    <label className="field"><span>Amount (M)</span><input className="input" inputMode="decimal" value={sched.amount} onChange={(e) => setSched({ ...sched, amount: e.target.value })} /></label>
                    <label className="field"><span>Reference</span><input className="input" value={sched.reference} maxLength={60} onChange={(e) => setSched({ ...sched, reference: e.target.value })} /></label>
                  </div>
                  <div className="row2">
                    <label className="field"><span>Repeat</span>
                      <select className="select" value={sched.frequency} onChange={(e) => setSched({ ...sched, frequency: e.target.value })}>
                        <option value="ONCE">Once</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option>
                      </select>
                    </label>
                    <label className="field"><span>Start date</span><input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={sched.start} onChange={(e) => setSched({ ...sched, start: e.target.value })} /></label>
                  </div>
                  {FromSelect}
                  <button className="btn block" disabled={busy}>{busy ? "Scheduling…" : "Schedule payment"}</button>
                </form>
              </section>
            </>
          )}
        </div>

        <aside className="grid" style={{ alignContent: "start" }}>
          <section className="panel">
            <div className="panel-head"><h2>Recent payments</h2></div>
            <div className="list">
              {!recent && <Skeleton h={120} />}
              {recent?.map((e) => (
                <div key={e.id} className="row">
                  <span className="ico round"><Icon name={e.type === "AIRTIME" ? "phone" : "bolt"} size={18} /></span>
                  <span className="grow"><span className="title">{e.narrative}</span><span className="sub">{fmtDateTime(e.createdAt)}</span></span>
                  <span style={{ textAlign: "right" }}><span className="amt num" style={{ display: "block" }}>{money(e.amount)}</span><span className="chip ok">Paid</span></span>
                </div>
              ))}
              {recent?.length === 0 && <div className="empty">No bill payments yet.</div>}
            </div>
          </section>
          <button className="panel row" style={{ cursor: "pointer", textAlign: "left", width: "100%", color: "inherit", font: "inherit" }} onClick={() => go("scheduled")}>
            <span className="ico"><Icon name="calendar" size={20} /></span>
            <span className="grow"><span className="title" style={{ color: "var(--gold)" }}>Scheduled payments</span><span className="sub">{data.scheduled.length} upcoming</span></span>
            <Icon name="chevron" size={16} />
          </button>
        </aside>
      </div>

      {pending && (
        <Modal title={pending.title} onClose={() => !busy && setPending(null)}>
          <div className="summary" style={{ marginBottom: 16 }}>
            {pending.lines.map(([k, v]) => <div key={k} className="line"><span>{k}</span><span>{v}</span></div>)}
          </div>
          <div className="foot">
            <button className="btn ghost" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
            <button className="btn" onClick={confirm} disabled={busy}>{busy ? "Paying…" : "Confirm & pay"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense><Payments /></Suspense>;
}
