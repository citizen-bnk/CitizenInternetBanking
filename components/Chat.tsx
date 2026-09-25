"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import type { Msg } from "./useAssistant";

export function ChatLog({ messages, busy }: { messages: Msg[]; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);
  return (
    <div className="chat" ref={ref} aria-live="polite">
      {messages.map((m, i) => (
        <div key={i} className={`bubble ${m.role === "user" ? "me" : "ai"}`}>
          {m.content}
          {m.action && (
            <div className="cta">
              <Link className="btn small" href={m.action.href}>{m.action.label} <Icon name="chevron" size={16} /></Link>
            </div>
          )}
        </div>
      ))}
      {busy && <div className="bubble ai faint">Citizen AI is thinking…</div>}
    </div>
  );
}

export function Composer({ onSend, onMic, listening, busy, partial, placeholder = "Speak or type to Citizen AI…" }: {
  onSend: (t: string) => void; onMic: () => void; listening: boolean; busy: boolean; partial?: string; placeholder?: string;
}) {
  const [text, setText] = useState("");
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!text.trim() || busy) return; onSend(text); setText(""); };
  return (
    <form className="composer" onSubmit={submit}>
      <button type="button" className={`mic${listening ? " on" : ""}`} onClick={onMic} aria-label={listening ? "Stop listening" : "Speak to Citizen AI"} aria-pressed={listening}>
        <Icon name="mic" size={20} />
      </button>
      <input value={listening ? partial ?? "" : text} onChange={(e) => setText(e.target.value)} placeholder={listening ? "Listening…" : placeholder} aria-label="Message Citizen AI" readOnly={listening} />
      <button className="send" type="submit" disabled={busy || !text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
    </form>
  );
}
