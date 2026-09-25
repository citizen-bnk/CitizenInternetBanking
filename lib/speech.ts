"use client";

/* Voice helpers: speech-to-text via the Web Speech API, text-to-speech via
   Core's ElevenLabs proxy (/api/tts) with the browser's built-in voice as fallback. */

type Rec = { lang: string; interimResults: boolean; start(): void; stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export function speechSupported() {
  return typeof window !== "undefined" && !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
}

export function listen(lang: string, onText: (partial: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const W = window as unknown as Record<string, new () => Rec>;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return reject(new Error("Voice input isn't available in this browser."));
    const r = new SR();
    r.lang = lang === "zu" ? "zu-ZA" : "en-ZA";
    r.interimResults = true;
    let final = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
      }
      onText((final + " " + interim).trim());
    };
    r.onerror = (e) => { if (e.error === "not-allowed") reject(new Error("Microphone permission is needed to hear you.")); };
    r.onend = () => resolve(final.trim());
    r.start();
    (listen as unknown as { current?: Rec }).current = r;
  });
}
export function stopListening() { (listen as unknown as { current?: Rec }).current?.stop(); }

let ttsUnavailable = false;
let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string, lang: string) {
  stopSpeaking();
  if (!ttsUnavailable) {
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language_code: lang }) });
      if (res.ok) {
        currentAudio = new Audio(URL.createObjectURL(await res.blob()));
        await currentAudio.play();
        return;
      }
      if (res.status === 501) ttsUnavailable = true;
    } catch { /* fall through */ }
  }
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "zu" ? "zu-ZA" : lang === "st" ? "st-ZA" : "en-ZA";
    window.speechSynthesis.speak(u);
  }
}
export function stopSpeaking() {
  currentAudio?.pause();
  currentAudio = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
