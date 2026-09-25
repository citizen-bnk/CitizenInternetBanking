"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Modal, PageHead, Skeleton } from "@/components/ui";
import { useBank } from "@/lib/bank";
import { fmtDay, money } from "@/lib/format";

const PRODUCTS = [
  { type: "PERSONAL", label: "Personal loan", rate: 10.5, max: 250000, maxTerm: 72, icon: "wallet" },
  { type: "BUSINESS", label: "Business loan", rate: 12.0, max: 2000000, maxTerm: 120, icon: "insights" },
  { type: "MORTGAGE", label: "Home loan (mortgage)", rate: 8.5, max: 5000000, maxTerm: 360, icon: "home" },
  { type: "VEHICLE", label: "Vehicle finance", rate: 9.0, max: 1000000, maxTerm: 84, icon: "send" },
  { type: "EDUCATION", label: "Education loan", rate: 7.5, max: 300000, maxTerm: 120, icon: "edu" },
];

export default function LoansPage() {
  const { data } = useBank();
  const [type, setType] = useState("PERSONAL");
  const p = PRODUCTS.find((x) => x.type === type)!;
  const [amount, setAmount] = useState(50000);
  const [months, setMonths] = useState(24);
  const [apply, setApply] = useState(false);

  const q = useMemo(() => {
    const r = p.rate / 100 / 12;
    const m = Math.min(months, p.maxTerm);
    const a = Math.min(amount, p.max);
    const monthly = (a * r) / (1 - Math.pow(1 + r, -m));
    return { monthly, total: monthly * m, interest: monthly * m - a, m, a };
  }, [p, amount, months]);

  if (!data) return <div className="grid"><Skeleton h={60} /><Skeleton h={300} /></div>;
  const active = data.loans.filter((l) => l.status === "ACTIVE");

  return (
    <>
      <PageHead title="Loans" sub="Your loans, repayments and a calculator for what's next." />
      <div className="split">
        <section className="panel">
          <div className="panel-head"><h2>My loans</h2></div>
          {active.length === 0 && <div className="empty">You don&apos;t have any active loans.</div>}
          {active.map((l) => {
            const paid = Math.max(0, 1 - Number(l.outstanding) / Number(l.principal));
            const prod = PRODUCTS.find((x) => x.type === l.type);
            return (
              <div key={l.id} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className="ico"><Icon name={prod?.icon ?? "loans"} size={20} /></span>
                  <span className="grow"><span className="title">{prod?.label ?? l.type}</span>
                    <span className="sub">{l.interestRate}% p.a. · {l.termMonths} months · principal {money(l.principal)}</span></span>
                  <span style={{ textAlign: "right" }}><span className="amt num" style={{ display: "block" }}>{money(l.outstanding)}</span><span className="faint" style={{ fontSize: 12 }}>outstanding</span></span>
                </div>
                <div className="limit-bar" aria-label={`${Math.round(paid * 100)}% repaid`}><i style={{ width: `${paid * 100}%` }} /></div>
                <div className="faint" style={{ fontSize: 12.5 }}>{Math.round(paid * 100)}% repaid · next payment {money(l.monthlyPayment)} on {fmtDay(l.nextPaymentDate)}</div>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Loan calculator</h2></div>
          <div className="pill-group" style={{ marginBottom: 18 }}>
            {PRODUCTS.map((x) => (
              <button key={x.type} className={type === x.type ? "active" : ""} onClick={() => { setType(x.type); setMonths(Math.min(months, x.maxTerm)); }}>
                {x.label.split(" (")[0]} · {x.rate}%
              </button>
            ))}
          </div>
          <label className="field"><span>Loan amount — {money(q.a)}</span>
            <input className="range" type="range" min={1000} max={p.max} step={1000} value={Math.min(amount, p.max)} onChange={(e) => setAmount(Number(e.target.value))} />
          </label>
          <label className="field"><span>Term — {q.m} months ({(q.m / 12).toFixed(1)} years)</span>
            <input className="range" type="range" min={6} max={p.maxTerm} step={6} value={q.m} onChange={(e) => setMonths(Number(e.target.value))} />
          </label>
          <div className="balance-card" style={{ margin: "6px 0 16px" }}>
            <div className="lbl">Estimated monthly repayment</div>
            <div className="big num">{money(q.monthly)}</div>
            <div className="eq">Total {money(q.total)} · interest {money(q.interest)} at {p.rate}% p.a.</div>
          </div>
          <button className="btn block" onClick={() => setApply(true)}>Apply for this loan</button>
          <p className="hint" style={{ marginTop: 10 }}>Estimate only. Final rates depend on an affordability and credit assessment.</p>
        </section>
      </div>
      {apply && (
        <Modal title="Loan applications" onClose={() => setApply(false)}>
          <p className="muted">Online loan applications open once Citizen Bank receives its banking licence from the Central Bank of Lesotho. Visit a branch to register your interest.</p>
          <div className="foot"><button className="btn" onClick={() => setApply(false)}>OK</button></div>
        </Modal>
      )}
    </>
  );
}
