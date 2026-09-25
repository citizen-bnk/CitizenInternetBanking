"use client";

import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useBank } from "@/lib/bank";
import { fuzzy, money } from "@/lib/format";
import { listen, speak, speechSupported, stopListening, stopSpeaking } from "@/lib/speech";
import type { Overview } from "@/lib/types";

export type Msg = { role: "user" | "assistant"; content: string; action?: { href: string; label: string } };
type Action = { flow: string; prefill: Record<string, string> };

/**
 * Maps an action proposed by Citizen AI to the page + pre-filled form where the
 * customer reviews and confirms it. The assistant never executes payments itself.
 */
export function actionToRoute(a: Action, data: Overview | null): { href: string; label: string } {
  const p = a.prefill || {};
  const q = new URLSearchParams();
  const set = (k: string, v?: string) => { if (v) q.set(k, v); };
  switch (a.flow) {
    case "sendMoney": {
      const b = data ? fuzzy(data.beneficiaries, p.beneficiary, (x) => x.name) : undefined;
      q.set("tab", b?.type === "LOCAL" ? "local" : b?.type === "INTERNATIONAL" ? "international" : "citizen");
      set("beneficiary", b?.id); set("name", !b ? p.beneficiary : undefined); set("amount", p.amount); set("from", p.fromAccount);
      return { href: `/transfers?${q}`, label: "Review payment" };
    }
    case "internalTransfer":
      q.set("tab", "own"); set("from", p.fromAccount); set("to", p.toAccount); set("amount", p.amount);
      return { href: `/transfers?${q}`, label: "Review transfer" };
    case "crossBorder":
      q.set("tab", "international"); set("country", p.country); set("name", p.recipient); set("account", p.accountNumber); set("amount", p.amount);
      return { href: `/transfers?${q}`, label: "Review international transfer" };
    case "addBeneficiary":
      q.set("tab", "citizen"); q.set("add", "1"); set("name", p.name); set("bank", p.bank); set("account", p.accountNumber);
      return { href: `/transfers?${q}`, label: "Add beneficiary" };
    case "payBills":
      set("biller", p.biller); set("amount", p.amount); set("reference", p.reference);
      return { href: `/payments?${q}`, label: "Review bill payment" };
    case "airtime":
      q.set("tab", "airtime"); set("network", p.network); set("number", p.number); set("amount", p.amount);
      return { href: `/payments?${q}`, label: "Review airtime" };
    case "setLimit": case "freezeCard": case "unfreezeCard": case "orderCard":
      set("card", p.card); q.set("action", a.flow); set("amount", p.amount);
      return { href: `/cards?${q}`, label: a.flow === "orderCard" ? "Order a card" : "Open card controls" };
    default:
      return { href: "/", label: "Continue" };
  }
}

/** Offline fallback when Core has no ANTHROPIC_API_KEY: keyword routing. */
function localAnswer(text: string, data: Overview | null): Msg {
  const t = text.toLowerCase();
  const amt = (t.match(/(\d[\d,]*(?:\.\d{1,2})?)/) || [])[1]?.replace(/,/g, "");
  if (/balance|how much (do|have) i/.test(t) && data) {
    const s = data.accounts.filter((a) => a.type !== "FIXED_DEPOSIT").map((a) => `${a.name} ${money(a.balance)}`).join(", ");
    return { role: "assistant", content: `Here are your balances: ${s}.` };
  }
  const flow = /airtime|data|top ?up/.test(t) ? "airtime" : /bill|electric|lec|wasco|water|dstv/.test(t) ? "payBills"
    : /abroad|international|south africa|botswana|zimbabwe/.test(t) ? "crossBorder" : /savings|between|own account/.test(t) ? "internalTransfer"
    : /card|freeze|limit/.test(t) ? "freezeCard" : /send|pay|transfer/.test(t) ? "sendMoney" : null;
  if (!flow) return { role: "assistant", content: "I can help with balances, transfers, bills, airtime, cross-border payments and your cards. What would you like to do?" };
  const who = data?.beneficiaries.find((b) => t.includes(b.name.split(" ")[0].toLowerCase()));
  const action = actionToRoute({ flow, prefill: { amount: amt ?? "", beneficiary: who?.name ?? "" } }, data);
  return { role: "assistant", content: "Sure — I've set that up for you to review.", action };
}

export function useAssistant(initial?: Msg[]) {
  const { data } = useBank();
  const [messages, setMessages] = useState<Msg[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [partial, setPartial] = useState("");
  const history = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const lang = data?.user.preferredLanguage ?? "en";

  const send = useCallback(async (text: string, opts: { voice?: boolean } = {}) => {
    const clean = text.trim();
    if (!clean || busy) return;
    stopSpeaking();
    setMessages((m) => [...m, { role: "user", content: clean }]);
    history.current = [...history.current, { role: "user" as const, content: clean }].slice(-12);
    setBusy(true);
    try {
      const res = await api<{ reply: string; action?: Action }>("/api/assistant", { body: { messages: history.current, language: lang } });
      history.current = [...history.current, { role: "assistant" as const, content: res.reply }].slice(-12);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, action: res.action ? actionToRoute(res.action, data) : undefined }]);
      if (opts.voice) { setSpeaking(true); speak(res.reply, lang).finally(() => setTimeout(() => setSpeaking(false), 1500)); }
    } catch (e) {
      history.current = history.current.slice(0, -1);
      if (e instanceof ApiError && e.code === "AI_OFFLINE") setMessages((m) => [...m, localAnswer(clean, data)]);
      else setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }, [busy, data, lang]);

  const voice = useCallback(async () => {
    if (listening) { stopListening(); return; }
    if (!speechSupported()) {
      setMessages((m) => [...m, { role: "assistant", content: "Voice input isn't available in this browser — please type your request instead." }]);
      return;
    }
    stopSpeaking();
    setListening(true);
    setPartial("");
    try {
      const text = await listen(lang, setPartial);
      setListening(false);
      setPartial("");
      if (text) await send(text, { voice: true });
    } catch (e) {
      setListening(false);
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "I couldn't hear that." }]);
    }
  }, [lang, listening, send]);

  return { messages, send, busy, listening, speaking, partial, voice };
}
