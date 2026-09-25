"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Modal, PageHead, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { fuzzy, money, parseAmount } from "@/lib/format";
import type { Card } from "@/lib/types";

const STATUS: Record<Card["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "ok" }, FROZEN: { label: "Frozen", cls: "warn" }, ORDERED: { label: "On its way", cls: "neutral" }, BLOCKED: { label: "Blocked", cls: "bad" },
};

function CardsPage() {
  const { data, refresh } = useBank();
  const params = useSearchParams();
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "limits" | "details" | "order" | "block">(null);
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [order, setOrder] = useState({ choice: "", form: "VIRTUAL", address: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const prefilled = useRef(false);

  const cards = data?.cards.filter((c) => c.status !== "BLOCKED") ?? [];
  const card = cards.find((c) => c.id === sel) ?? cards[0];

  useEffect(() => {
    if (!data || prefilled.current) return;
    prefilled.current = true;
    const want = params.get("card");
    const m = want ? fuzzy(cards, want, (c) => c.label) : undefined;
    if (m) setSel(m.id);
    const action = params.get("action");
    const target = m ?? cards[0];
    if (action === "setLimit" && target) { setDaily(String(parseAmount(params.get("amount") ?? "") || target.dailyLimit)); setMonthly(String(Number(target.monthlyLimit))); setModal("limits"); }
    if (action === "orderCard") setModal("order");
    if ((action === "freezeCard" || action === "unfreezeCard") && target) setMsg({ ok: true, text: `Use the ${action === "freezeCard" ? "Freeze" : "Unfreeze"} button below to ${action === "freezeCard" ? "freeze" : "unfreeze"} your ${target.label} card.` });
  }, [data, params, cards]);

  if (!data) return <div className="grid"><Skeleton h={60} /><Skeleton h={240} /></div>;
  const acct = (id: string | null) => data.accounts.find((a) => a.id === id);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); await refresh(); setMsg({ ok: true, text: ok }); setModal(null); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't work." }); }
    finally { setBusy(false); }
  }

  const choices = [
    ...(cards.some((c) => c.kind === "CRYPTO") ? [] : [{ label: "Crypto card", body: { kind: "CRYPTO" } }]),
    ...cards.filter((c) => c.kind === "DEBIT").map((c) => ({ label: `Replacement ${c.label} card`, body: { kind: "DEBIT", accountId: c.accountId, replacesCardId: c.id } })),
    ...data.accounts.filter((a) => a.type !== "FIXED_DEPOSIT" && !cards.some((c) => c.accountId === a.id)).map((a) => ({ label: `New ${a.name.replace(/ Account$/, "")} debit card`, body: { kind: "DEBIT", accountId: a.id } })),
  ];

  return (
    <>
      <PageHead title="My Cards" sub="Freeze, set limits and order cards instantly."
        actions={<button className="btn small" onClick={() => { setOrder({ choice: choices[0]?.label ?? "", form: "VIRTUAL", address: "" }); setModal("order"); }}><Icon name="plus" size={16} /> Order a card</button>} />
      {msg && <div className={`alert ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <div className="cards-row" role="listbox" aria-label="Your cards">
        {cards.map((c) => {
          const a = acct(c.accountId);
          return (
            <div key={c.id} role="option" aria-selected={card?.id === c.id} tabIndex={0}
              className={`bank-card ${c.kind === "CRYPTO" ? "crypto" : a?.type === "SAVINGS" ? "savings" : ""}${card?.id === c.id ? " sel" : ""}${c.status === "FROZEN" ? " frozen" : ""}`}
              onClick={() => setSel(c.id)} onKeyDown={(e) => e.key === "Enter" && setSel(c.id)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="top"><span><img src="/brand/logo.png" alt="" />citizen bank</span><b>{c.brand === "CRYPTO" ? "₿" : c.brand}</b></div>
              <div className="pan">•••• •••• •••• {c.last4}</div>
              <div className="bottom">
                <span>{c.kind === "CRYPTO" ? "Crypto" : `${c.label} · Debit`}<b>{data.user.firstName} {data.user.lastName}</b></span>
                <span style={{ textAlign: "right" }}>Valid thru<b>{c.expiry}</b></span>
              </div>
            </div>
          );
        })}
        {!cards.length && <div className="empty">No cards yet — order one to get started.</div>}
      </div>

      {card && (
        <>
          <div className="card-actions">
            <button disabled={busy || card.status === "ORDERED"} onClick={() => run(() => api(`/api/cards/${card.id}/status`, { body: { action: card.status === "FROZEN" ? "unfreeze" : "freeze" } }),
              card.status === "FROZEN" ? `Your ${card.label} card is active again.` : `Your ${card.label} card is frozen — no new transactions will go through.`)}>
              <Icon name="snow" />{card.status === "FROZEN" ? "Unfreeze card" : "Freeze card"}
            </button>
            <button onClick={() => setModal("details")}><Icon name="eye" />Card details</button>
            <button onClick={() => { setDaily(String(Number(card.dailyLimit))); setMonthly(String(Number(card.monthlyLimit))); setModal("limits"); }}><Icon name="clock" />Limits</button>
            <button onClick={() => setModal("block")}><Icon name="lock" />Lost or stolen</button>
          </div>

          <div className="two-col">
            <section className="panel">
              <div className="panel-head"><h2>Card details</h2><span className={`chip ${STATUS[card.status].cls}`}>{STATUS[card.status].label}</span></div>
              <div className="summary">
                <div className="line"><span>Card</span><span>{card.kind === "CRYPTO" ? "Crypto (wallet coming soon)" : `Debit — ${acct(card.accountId)?.name ?? card.label}`}</span></div>
                <div className="line"><span>Number</span><span>•••• {card.last4}</span></div>
                <div className="line"><span>Form</span><span>{card.form === "PHYSICAL" ? "Virtual + physical" : "Virtual only"}</span></div>
                <div className="line"><span>Expiry</span><span>{card.expiry}</span></div>
                {card.accountId && <div className="line"><span>Available balance</span><span className="num">{money(acct(card.accountId)?.balance)}</span></div>}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head"><h2>Card limits</h2><button className="link" onClick={() => { setDaily(String(Number(card.dailyLimit))); setMonthly(String(Number(card.monthlyLimit))); setModal("limits"); }}>Manage</button></div>
              <div className="grid" style={{ gap: 16 }}>
                <div><div className="muted">Daily spend limit</div><div className="stat"><span className="v num" style={{ fontSize: 22 }}>{money(card.dailyLimit)}</span></div>
                  <div className="limit-bar"><i style={{ width: `${Math.min(100, (Number(card.dailyLimit) / Number(card.monthlyLimit)) * 100)}%` }} /></div></div>
                <div><div className="muted">Monthly spend limit</div><div className="stat"><span className="v num" style={{ fontSize: 22 }}>{money(card.monthlyLimit)}</span></div>
                  <div className="limit-bar"><i style={{ width: "100%" }} /></div></div>
              </div>
            </section>
          </div>
          <div className="panel row" style={{ gap: 16 }}>
            <span className="ico" style={{ color: "var(--coral)" }}><Icon name="shield" /></span>
            <span className="grow"><span className="title">Lost or stolen card?</span><span className="sub">Freeze it instantly, or block it permanently and order a replacement.</span></span>
            <button className="btn small" onClick={() => setModal("block")}>Report / block</button>
          </div>
        </>
      )}

      {modal === "limits" && card && (
        <Modal title={`${card.label} card limits`} onClose={() => setModal(null)}>
          <label className="field"><span>Daily limit (M)</span><input className="input" inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value)} /></label>
          <label className="field"><span>Monthly limit (M)</span><input className="input" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></label>
          <p className="hint">Limits can be up to M100,000. The daily limit can&apos;t exceed the monthly limit.</p>
          <div className="foot">
            <button className="btn ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn" disabled={busy} onClick={() => run(() => api(`/api/cards/${card.id}/limits`, { method: "PATCH", body: { daily: parseAmount(daily), monthly: parseAmount(monthly) } }), "Card limits updated.")}>Save limits</button>
          </div>
        </Modal>
      )}
      {modal === "details" && card && (
        <Modal title="Card details" onClose={() => setModal(null)}>
          <div className="summary">
            <div className="line"><span>Cardholder</span><span>{data.user.firstName} {data.user.lastName}</span></div>
            <div className="line"><span>Card number</span><span>•••• •••• •••• {card.last4}</span></div>
            <div className="line"><span>Expiry</span><span>{card.expiry}</span></div>
            <div className="line"><span>Network</span><span>{card.brand}</span></div>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>For your security, the full card number, CVV and PIN are never shown in internet banking.</p>
        </Modal>
      )}
      {modal === "block" && card && (
        <Modal title="Block this card?" onClose={() => setModal(null)}>
          <p className="muted">Blocking your {card.label} card (•••• {card.last4}) is permanent. If you might find it, freeze it instead. You can order a replacement straight away.</p>
          <div className="foot">
            <button className="btn ghost" onClick={() => setModal(null)}>Keep card</button>
            <button className="btn secondary" disabled={busy} onClick={() => run(() => api(`/api/cards/${card.id}/status`, { body: { action: "freeze" } }), "Card frozen.")}>Freeze instead</button>
            <button className="btn danger" disabled={busy} onClick={() => run(() => api(`/api/cards/${card.id}/status`, { body: { action: "block" } }), "Card blocked. Order a replacement below.").then(() => setSel(null))}>Block card</button>
          </div>
        </Modal>
      )}
      {modal === "order" && (
        <Modal title="Order a card" onClose={() => setModal(null)}>
          {!choices.length ? <p className="muted">You already have every card available to you.</p> : (
            <>
              <label className="field"><span>Card</span>
                <select className="select" value={order.choice} onChange={(e) => setOrder({ ...order, choice: e.target.value })}>
                  {choices.map((c) => <option key={c.label}>{c.label}</option>)}
                </select>
              </label>
              <div className="field"><span>Type</span>
                <div className="pill-group">{["VIRTUAL", "PHYSICAL"].map((f) => <button key={f} className={order.form === f ? "active" : ""} onClick={() => setOrder({ ...order, form: f })}>{f === "VIRTUAL" ? "Virtual (instant)" : "Physical (3–5 days)"}</button>)}</div>
              </div>
              {order.form === "PHYSICAL" && <label className="field"><span>Delivery address</span><input className="input" value={order.address} onChange={(e) => setOrder({ ...order, address: e.target.value })} placeholder="Street, town" /></label>}
              <div className="foot">
                <button className="btn ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={() => {
                  const c = choices.find((x) => x.label === order.choice) ?? choices[0];
                  run(() => api("/api/cards", { body: { ...c.body, form: order.form, deliveryAddress: order.address || undefined } }),
                    order.form === "VIRTUAL" ? "Your new virtual card is ready to use." : "Your card is ordered — we'll let you know when it ships.");
                }}>Order card</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense><CardsPage /></Suspense>;
}
