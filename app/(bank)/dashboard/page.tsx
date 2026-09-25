"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { ChatLog, Composer } from "@/components/Chat";
import { Skeleton } from "@/components/ui";
import { useAssistant } from "@/components/useAssistant";
import { useBank } from "@/lib/bank";
import { fmtDateTime, greeting, localEquiv, money } from "@/lib/format";

const QUICK = [
  { href: "/transfers", icon: "send", label: "Send Money" },
  { href: "/payments", icon: "bill", label: "Pay Bills" },
  { href: "/payments?tab=airtime", icon: "phone", label: "Buy Airtime" },
  { href: "/transfers?tab=own", icon: "transfer", label: "Transfer" },
  { href: "/cards", icon: "cards", label: "Manage Cards" },
];

export default function Dashboard() {
  const { data } = useBank();
  const [hide, setHide] = useState(false);
  const ai = useAssistant([{ role: "assistant", content: "Hi! How can I help you today?" }]);
  const mask = (v: string) => (hide ? "M ••••••" : v);

  if (!data) return <div className="grid"><Skeleton h={80} /><Skeleton h={160} /><Skeleton h={300} /></div>;
  const spendable = data.accounts.filter((a) => a.type !== "FIXED_DEPOSIT");
  const available = spendable.reduce((s, a) => s + Number(a.balance), 0);
  const eq = localEquiv(available, data.locale);
  const out = data.recent.filter((r) => Number(r.amount) < 0);

  return (
    <div className="dash">
      <div style={{ minWidth: 0 }}>
        <div className="hello">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="orb-mini"><img src="/brand/logo.png" alt="" /></div>
          <div>
            <h1>{greeting()}, {data.user.firstName} 👋</h1>
            <p>Welcome to Citizen Bank — your smarter banking partner.</p>
          </div>
        </div>

        <div className="balance-row">
          <div className="balance-card">
            <div className="lbl">Total available balance
              <button className="eye-btn" onClick={() => setHide((h) => !h)} aria-label={hide ? "Show balances" : "Hide balances"}><Icon name={hide ? "eyeOff" : "eye"} size={16} /></button>
            </div>
            <div className="big num">{mask(money(available))}</div>
            <div className="eq">{eq && !hide ? `≈ ${eq} (indicative)` : "Lesotho maloti · LSL"}</div>
          </div>
          {data.accounts.slice(0, 3).map((a) => (
            <Link key={a.id} className="acct-tile" href={`/accounts?id=${a.id}`}>
              <span className="ico" style={{ width: 38, height: 38 }}><Icon name={a.type === "SAVINGS" ? "piggy" : a.type === "FIXED_DEPOSIT" ? "lock" : "wallet"} size={18} /></span>
              <span className="muted">{a.name.replace(/ Account$/, "")}</span>
              <span className="v num">{mask(money(a.balance))}</span>
              <span className="faint" style={{ fontSize: 12 }}>{a.type === "FIXED_DEPOSIT" && a.interestRate ? `${a.interestRate}% p.a.` : `•••• ${a.last4}`}</span>
            </Link>
          ))}
        </div>

        <div className="panel-head"><h2>Quick actions</h2></div>
        <div className="quick">
          {QUICK.map((q) => <Link key={q.label} href={q.href}><Icon name={q.icon} size={26} />{q.label}</Link>)}
        </div>

        <div className="two-col">
          <section className="panel">
            <div className="panel-head"><h2>My accounts</h2><Link href="/accounts">View all →</Link></div>
            <div className="list">
              {data.accounts.map((a) => (
                <Link key={a.id} href={`/accounts?id=${a.id}`} className="row">
                  <span className="ico"><Icon name={a.type === "SAVINGS" ? "piggy" : a.type === "FIXED_DEPOSIT" ? "lock" : "wallet"} size={20} /></span>
                  <span className="grow"><span className="title">{a.name}</span><span className="sub">•••• {a.last4}</span></span>
                  <span style={{ textAlign: "right" }}><span className="amt num" style={{ display: "block" }}>{mask(money(a.balance))}</span><span className="chip ok">Active</span></span>
                </Link>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Recent transactions</h2><Link href="/accounts">View all →</Link></div>
            <div className="list">
              {data.recent.slice(0, 5).map((t) => {
                const inc = Number(t.amount) > 0;
                return (
                  <div key={t.id} className="row">
                    <span className={`ico round${inc ? " in" : ""}`}><Icon name={inc ? "down" : t.type === "BILL_PAYMENT" ? "bolt" : t.type === "AIRTIME" ? "phone" : "up"} size={18} /></span>
                    <span className="grow"><span className="title">{t.narrative}</span><span className="sub">{fmtDateTime(t.createdAt)}</span></span>
                    <span className={`amt num ${inc ? "pos" : ""}`}>{mask(money(t.amount, { sign: true }))}</span>
                  </div>
                );
              })}
              {!data.recent.length && <div className="empty">No transactions yet.</div>}
            </div>
          </section>
        </div>

        <div className="promos">
          <Link href="/transfers?tab=international" className="promo warm"><Icon name="globe" /><h3>Cross-Border Banking</h3><p>Send money across Lesotho, South Africa and beyond.</p><span className="go"><Icon name="chevron" size={16} /></span></Link>
          <Link href="/cards" className="promo violet"><Icon name="cards" /><h3>Digital Cards</h3><p>Virtual and physical cards with full control.</p><span className="go"><Icon name="chevron" size={16} /></span></Link>
          <Link href="/insights" className="promo magenta"><Icon name="insights" /><h3>Financial Insights</h3><p>{out.length ? "See where your money went this month." : "Smarter spending. Better decisions."}</p><span className="go"><Icon name="chevron" size={16} /></span></Link>
          <Link href="/settings" className="promo"><Icon name="shield" /><h3>Bank Securely</h3><p className="muted">Your money and data protected with industry-leading security.</p><span className="go"><Icon name="chevron" size={16} /></span></Link>
        </div>
      </div>

      <aside className="panel ai-panel" aria-label="Citizen Bank AI">
        <div className="head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" />
          <div><b>Citizen Bank AI</b><div className="online">Online</div></div>
        </div>
        <ChatLog messages={ai.messages} busy={ai.busy} />
        <Composer onSend={(t) => ai.send(t)} onMic={ai.voice} listening={ai.listening} busy={ai.busy} partial={ai.partial} placeholder="Type or speak your request…" />
      </aside>
    </div>
  );
}
