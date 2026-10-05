"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import { ChatLog, Composer } from "@/components/Chat";
import { Orb, SecureNote } from "@/components/ui";
import { useAssistant } from "@/components/useAssistant";
import { useBank } from "@/lib/bank";
import { greeting, money } from "@/lib/format";

const SUGGESTIONS = [
  { icon: "chat", title: "Account inquiries", ex: "What is my balance?" },
  { icon: "transfer", title: "Send or transfer money", ex: "Send M500 to Thabo" },
  { icon: "bill", title: "Pay bills & services", ex: "Pay my LEC electricity" },
  { icon: "globe", title: "International payments", ex: "Send money to South Africa" },
  { icon: "insights", title: "Spending insights", ex: "How much did I spend this month?" },
];

function AiHome() {
  const { data } = useBank();
  const params = useSearchParams();
  const { messages, send, busy, listening, speaking, partial, voice, voiceReplies, toggleVoiceReplies } = useAssistant();
  const asked = useRef(false);

  useEffect(() => {
    const q = params.get("ask");
    if (q && data && !asked.current) { asked.current = true; send(q); }
  }, [params, data, send]);

  const last = [...messages].reverse().find((m) => m.role === "assistant");
  const state = listening ? "listening" : busy ? "busy" : speaking ? "speaking" : "idle";
  const spendable = data?.accounts.filter((a) => a.type !== "FIXED_DEPOSIT") ?? [];
  const total = data?.accounts.reduce((s, a) => s + Number(a.balance), 0) ?? 0;

  return (
    <div className="ai-layout">
      <section className="ai-stage">
        <div className="greet">
          <h1>{greeting()}, {data?.user.firstName ?? "…"} 👋</h1>
          <p>I&apos;m Citizen AI, your personal banking assistant.</p>
        </div>
        <Orb state={state} onClick={voice} />
        <div className="caption">
          {listening ? (partial || "I'm listening…") : last ? last.content : (
            <>How can I help you today?<small>You can ask me about your accounts, make payments, transfer money and more.</small></>
          )}
        </div>
        {messages.length > 0 && <ChatLog messages={messages} busy={busy} />}
        <Composer onSend={(t) => send(t)} onMic={voice} listening={listening} busy={busy} partial={partial} voiceReplies={voiceReplies} onToggleVoice={toggleVoiceReplies} />
        <SecureNote />
      </section>

      <aside className="ai-side grid" style={{ alignContent: "start" }}>
        <div className="panel">
          <div className="panel-head"><h2>Citizen AI can help you with</h2></div>
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s.title} onClick={() => send(s.ex)} disabled={busy}>
                <span className="ico" style={{ width: 38, height: 38 }}><Icon name={s.icon} size={18} /></span>
                <span><b>{s.title}</b><small>e.g. &ldquo;{s.ex}&rdquo;</small></span>
                <Icon name="chevron" size={16} className="chev" />
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>My accounts</h2><Link href="/accounts">View all</Link></div>
          <div className="faint" style={{ fontSize: 12.5 }}>Total balance</div>
          <div style={{ fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700, margin: "2px 0 10px" }}>{data ? money(total) : "…"}</div>
          <div className="list">
            {spendable.map((a) => (
              <Link key={a.id} href={`/accounts?id=${a.id}`} className="row" style={{ padding: "10px 0" }}>
                <span className="ico" style={{ width: 36, height: 36 }}><Icon name={a.type === "SAVINGS" ? "piggy" : "wallet"} size={18} /></span>
                <span className="grow"><span className="title">{a.name}</span><span className="sub">•••• {a.last4}</span></span>
                <span className="amt pos">{money(a.balance)}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="tip">
          <h3><Icon name="shield" size={18} /> Your security matters</h3>
          <p>Citizen AI can look up your information, but every payment waits for you to review and confirm it.</p>
        </div>
        <div className="tip">
          <h3><Icon name="bulb" size={18} /> Tip of the day</h3>
          <p>You can speak naturally. Tap the orb and try saying &ldquo;Show my spending this month&rdquo;.</p>
        </div>
      </aside>
    </div>
  );
}

export default function Page() {
  return <Suspense><AiHome /></Suspense>;
}
