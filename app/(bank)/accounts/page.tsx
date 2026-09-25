"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { PageHead, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { fmtDateTime, fmtDay, localEquiv, money } from "@/lib/format";
import type { Entry } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = { CURRENT: "Transactional", SAVINGS: "Savings", FIXED_DEPOSIT: "Fixed deposit" };

function Accounts() {
  const { data } = useBank();
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id") ?? data?.accounts[0]?.id;
  const acc = data?.accounts.find((a) => a.id === selectedId) ?? data?.accounts[0];
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"all" | "in" | "out">("all");

  useEffect(() => {
    if (!acc) return;
    setEntries(null);
    api<Entry[]>(`/api/transactions?accountId=${encodeURIComponent(acc.id)}&limit=200`).then(setEntries).catch(() => setEntries([]));
  }, [acc?.id, acc?.balance]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => (entries ?? []).filter((e) => {
    const n = Number(e.amount);
    if (dir === "in" && n < 0) return false;
    if (dir === "out" && n > 0) return false;
    return !q || e.narrative.toLowerCase().includes(q.toLowerCase()) || e.reference.toLowerCase().includes(q.toLowerCase());
  }), [entries, q, dir]);

  if (!data || !acc) return <div className="grid"><Skeleton h={60} /><Skeleton h={400} /></div>;
  const total = data.accounts.reduce((s, a) => s + Number(a.balance), 0);
  const eq = localEquiv(total, data.locale);

  return (
    <>
      <PageHead title="My Accounts" sub={`Total balance ${money(total)}${eq ? ` · ≈ ${eq}` : ""} across ${data.accounts.length} accounts`}
        actions={<Link className="btn secondary small" href="/transfers?tab=own"><Icon name="transfer" size={16} /> Move money</Link>} />
      <div className="split" style={{ gridTemplateColumns: "minmax(0,0.8fr) minmax(0,1.4fr)" }}>
        <div>
          {data.accounts.map((a) => (
            <div key={a.id} className={`row clickable${a.id === acc.id ? " selected" : ""}`} onClick={() => router.replace(`/accounts?id=${a.id}`)}
              role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && router.replace(`/accounts?id=${a.id}`)}>
              <span className="ico"><Icon name={a.type === "SAVINGS" ? "piggy" : a.type === "FIXED_DEPOSIT" ? "lock" : "wallet"} size={20} /></span>
              <span className="grow"><span className="title">{a.name}</span><span className="sub">{a.number.replace(/(\d{4})(?=\d)/g, "$1 ")}</span></span>
              <span style={{ textAlign: "right" }}><span className="amt pos num" style={{ display: "block" }}>{money(a.balance)}</span><span className="faint" style={{ fontSize: 12 }}>Available</span></span>
            </div>
          ))}
        </div>

        <section className="panel">
          <div className="panel-head" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="muted">{acc.name} · {TYPE_LABEL[acc.type]}</div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 32, fontWeight: 700, margin: "4px 0" }} className="num">{money(acc.balance)}</div>
              <div className="faint" style={{ fontSize: 12.5 }}>
                Account {acc.number}{acc.interestRate ? ` · ${acc.interestRate}% p.a.` : ""}{acc.maturesAt ? ` · matures ${fmtDay(acc.maturesAt)}` : ""}
              </div>
            </div>
            <Link className="btn secondary small" href={`/statements/${acc.id}`} target="_blank"><Icon name="download" size={16} /> Statement</Link>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <label className="search-in" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions" aria-label="Search transactions" />
            </label>
            <div className="pill-group">
              {(["all", "in", "out"] as const).map((d) => (
                <button key={d} className={dir === d ? "active" : ""} onClick={() => setDir(d)}>{d === "all" ? "All" : d === "in" ? "Money in" : "Money out"}</button>
              ))}
            </div>
          </div>

          <div className="list">
            {!entries && [0, 1, 2, 3].map((i) => <Skeleton key={i} h={52} style={{ margin: "8px 0" }} />)}
            {entries && filtered.length === 0 && <div className="empty">No transactions match.</div>}
            {filtered.map((t) => {
              const inc = Number(t.amount) > 0;
              return (
                <div key={t.id} className="row">
                  <span className={`ico round${inc ? " in" : ""}`}><Icon name={inc ? "down" : t.type === "BILL_PAYMENT" ? "bolt" : t.type === "AIRTIME" ? "phone" : "up"} size={18} /></span>
                  <span className="grow"><span className="title">{t.narrative}</span><span className="sub">{fmtDateTime(t.createdAt)} · {t.reference}</span></span>
                  <span style={{ textAlign: "right" }}>
                    <span className={`amt num ${inc ? "pos" : ""}`} style={{ display: "block" }}>{money(t.amount, { sign: true })}</span>
                    <span className="faint num" style={{ fontSize: 12 }}>Bal {money(t.balanceAfter)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return <Suspense><Accounts /></Suspense>;
}
