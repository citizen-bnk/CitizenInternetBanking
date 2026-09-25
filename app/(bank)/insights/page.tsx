"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { PageHead, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { money } from "@/lib/format";
import type { Entry } from "@/lib/types";

type Insights = { thisMonth: number; lastMonth: number; byCategory: { category: string; thisMonth: number; lastMonth: number }[] };

export default function InsightsPage() {
  const { data } = useBank();
  const [ins, setIns] = useState<Insights | null>(null);
  const [flow, setFlow] = useState<{ in: number; out: number } | null>(null);
  const [table, setTable] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<Insights>("/api/insights").then(setIns).catch((e) => setErr(e.message));
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    api<Entry[]>(`/api/transactions?from=${start.toISOString()}&limit=500`).then((rows) => {
      const ext = rows.filter((r) => r.type !== "INTERNAL_TRANSFER");
      setFlow({
        in: ext.filter((r) => Number(r.amount) > 0).reduce((s, r) => s + Number(r.amount), 0),
        out: ext.filter((r) => Number(r.amount) < 0).reduce((s, r) => s - Number(r.amount), 0),
      });
    }).catch(() => setFlow({ in: 0, out: 0 }));
  }, [data?.recent?.[0]?.id]);

  const max = Math.max(1, ...(ins?.byCategory.flatMap((c) => [c.thisMonth, c.lastMonth]) ?? [1]));
  const month = new Date().toLocaleDateString("en-GB", { month: "long" });
  const top = ins?.byCategory[0];

  return (
    <>
      <PageHead title="Financial Insights" sub={`Where your money went in ${month}.`} />
      {err && <div className="alert err">{err}</div>}
      <div className="balance-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          { label: "Money in this month", v: flow?.in, icon: "down" },
          { label: "Money out this month", v: flow?.out, icon: "up" },
          { label: "Net cash flow", v: flow ? flow.in - flow.out : undefined, icon: "insights" },
        ].map((s) => (
          <div key={s.label} className="panel stat">
            <span className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name={s.icon} size={16} />{s.label}</span>
            {s.v === undefined ? <Skeleton h={34} /> : <span className="v num">{money(s.v)}</span>}
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Spending by category</h2>
          <button className="link" onClick={() => setTable((t) => !t)}>{table ? "Show chart" : "Show as table"}</button>
        </div>
        {!ins && <Skeleton h={200} />}
        {ins && ins.byCategory.length === 0 && <div className="empty">No spending in the last two months.</div>}
        {ins && ins.byCategory.length > 0 && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              You&apos;ve spent <b>{money(ins.thisMonth)}</b> so far in {month}{top ? <>, most of it on <b>{top.category.toLowerCase()}</b></> : null}.
              Last month you spent {money(ins.lastMonth)} in total.
            </p>
            {!table ? (
              <>
                <div className="legend" aria-hidden="true">
                  <span><i style={{ background: "var(--series-this)" }} />This month (to date)</span>
                  <span><i style={{ background: "var(--series-last)" }} />Last month</span>
                </div>
                <div className="bars" role="img" aria-label="Spending by category, this month compared with last month">
                  {ins.byCategory.map((c) => (
                    <div key={c.category} className="bar-row" title={`${c.category}: ${money(c.thisMonth)} this month, ${money(c.lastMonth)} last month`}>
                      <span>{c.category}</span>
                      <div className="bar-pair">
                        <div className="bar-line"><i className="this" style={{ width: `${(c.thisMonth / max) * 80}%` }} /><span>{money(c.thisMonth)}</span></div>
                        <div className="bar-line"><i className="last" style={{ width: `${(c.lastMonth / max) * 80}%` }} /><span>{money(c.lastMonth)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <table className="data-table">
                <thead><tr><th>Category</th><th className="r">This month</th><th className="r">Last month</th></tr></thead>
                <tbody>{ins.byCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td className="r">{money(c.thisMonth)}</td><td className="r">{money(c.lastMonth)}</td></tr>)}</tbody>
              </table>
            )}
          </>
        )}
      </section>
      <div className="tip" style={{ marginTop: 18 }}>
        <h3><Icon name="bulb" size={18} /> Ask Citizen AI</h3>
        <p>Try &ldquo;How much did I spend on airtime this month?&rdquo; or &ldquo;Compare my bills with last month&rdquo; on the Citizen AI page.</p>
      </div>
    </>
  );
}
