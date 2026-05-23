"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Briefing } from "@/lib/types";

type Status = "idle" | "loading" | "speaking" | "done" | "error";

export default function Page() {
  const [status, setStatus] = useState<Status>("idle");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState<string>("");
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback((script: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Text-to-speech isn't supported on this browser.");
      setStatus("error");
      return;
    }
    window.speechSynthesis.cancel();

    const sentences = script
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter(Boolean);

    const utterances = sentences.map((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onstart = () => setCurrentLine(sentence);
      if (i === sentences.length - 1) {
        u.onend = () => {
          setStatus("done");
          setCurrentLine("");
        };
      }
      return u;
    });

    utterancesRef.current = utterances;
    setStatus("speaking");
    for (const u of utterances) window.speechSynthesis.speak(u);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setBriefing(null);
    setCurrentLine("");
    setStatus("loading");

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const primer = new SpeechSynthesisUtterance(" ");
      primer.volume = 0;
      window.speechSynthesis.speak(primer);
    }

    try {
      const res = await fetch("/api/briefing", { cache: "no-store" });
      if (!res.ok) throw new Error(`Briefing failed: ${res.status}`);
      const data = (await res.json()) as Briefing;
      setBriefing(data);
      speak(data.script);
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }, [speak]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setStatus("done");
    setCurrentLine("");
  }, []);

  const replay = useCallback(() => {
    if (briefing) speak(briefing.script);
  }, [briefing, speak]);

  return (
    <main className="min-h-[100dvh] flex flex-col items-center px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="w-full max-w-xl flex flex-col items-center gap-1 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-accent)]">
          Oakwind Rustle
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Your one-tap daily briefing.
        </p>
      </header>

      <section className="w-full max-w-xl flex flex-col items-center">
        {status === "idle" || status === "error" ? (
          <button
            onClick={start}
            className="w-56 h-56 rounded-full bg-[var(--color-accent)] text-[#1a1408] text-2xl font-semibold shadow-2xl active:scale-95 transition-transform select-none"
          >
            Start briefing
          </button>
        ) : status === "loading" ? (
          <div className="w-56 h-56 rounded-full border-4 border-[var(--color-accent)] border-t-transparent animate-spin" />
        ) : (
          <button
            onClick={stop}
            className="w-56 h-56 rounded-full border-4 border-[var(--color-accent)] text-[var(--color-accent)] text-xl font-semibold active:scale-95 transition-transform select-none"
          >
            {status === "speaking" ? "Stop" : "Done"}
          </button>
        )}

        {error && (
          <p className="mt-6 text-sm text-red-400 text-center max-w-md">{error}</p>
        )}

        {currentLine && (
          <p className="mt-8 text-center text-lg leading-snug max-w-md text-[var(--color-fg)]">
            {currentLine}
          </p>
        )}

        {briefing && status !== "speaking" && status !== "loading" && (
          <div className="mt-10 w-full flex justify-center gap-3">
            <button
              onClick={replay}
              className="px-4 py-2 rounded-md border border-[var(--color-muted)] text-sm text-[var(--color-fg)]"
            >
              Replay
            </button>
            <button
              onClick={start}
              className="px-4 py-2 rounded-md border border-[var(--color-muted)] text-sm text-[var(--color-fg)]"
            >
              Refresh
            </button>
          </div>
        )}
      </section>

      {briefing && (
        <section className="mt-12 w-full max-w-xl flex flex-col gap-6 text-sm">
          <BriefingDetails briefing={briefing} />
        </section>
      )}
    </main>
  );
}

function BriefingDetails({ briefing }: { briefing: Briefing }) {
  return (
    <>
      <Card title="Weather">
        {"error" in briefing.weather ? (
          <ErrorLine msg={briefing.weather.error} />
        ) : (
          <div className="space-y-1">
            <p className="text-lg">
              {briefing.weather.tempF}&deg;F &middot; {briefing.weather.conditions}
            </p>
            <p className="text-[var(--color-muted)]">
              {briefing.weather.location}
              {briefing.weather.highF != null && briefing.weather.lowF != null
                ? ` · H ${briefing.weather.highF} / L ${briefing.weather.lowF}`
                : ""}
              {briefing.weather.precipChancePct != null
                ? ` · ${briefing.weather.precipChancePct}% precip`
                : ""}
            </p>
          </div>
        )}
      </Card>

      <Card title="Email">
        {"error" in briefing.email ? (
          <ErrorLine msg={briefing.email.error} />
        ) : !briefing.email.configured ? (
          <p className="text-[var(--color-muted)]">
            Not connected.{" "}
            <a href="/api/auth/gmail/start" className="underline">
              Authorize Gmail
            </a>
            .
          </p>
        ) : (
          <div className="space-y-3">
            <p>
              <strong>{briefing.email.unreadCount}</strong> unread ·{" "}
              <strong>{briefing.email.flaggedCount}</strong> flagged
            </p>
            {briefing.email.unread.slice(0, 5).map((m) => (
              <div key={m.id} className="border-l-2 border-[var(--color-accent)] pl-3">
                <p className="font-medium">{m.subject}</p>
                <p className="text-[var(--color-muted)] text-xs">{m.from}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Local news">
        {"error" in briefing.news ? (
          <ErrorLine msg={briefing.news.error} />
        ) : briefing.news.local.length === 0 ? (
          <p className="text-[var(--color-muted)]">No local stories.</p>
        ) : (
          <ul className="space-y-3">
            {briefing.news.local.map((item) => (
              <li key={item.url}>
                <a href={item.url} className="underline" target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                <p className="text-xs text-[var(--color-muted)]">{item.source}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="AI news">
        {"error" in briefing.news ? null : briefing.news.ai.length === 0 ? (
          <p className="text-[var(--color-muted)]">Nothing notable.</p>
        ) : (
          <ul className="space-y-3">
            {briefing.news.ai.map((item) => (
              <li key={item.url}>
                <a href={item.url} className="underline" target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                <p className="text-xs text-[var(--color-muted)]">{item.source}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-center text-xs text-[var(--color-muted)] mt-2">
        Generated {new Date(briefing.generatedAt).toLocaleTimeString()}
      </p>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 rounded-xl p-4">
      <h2 className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ErrorLine({ msg }: { msg: string }) {
  return <p className="text-red-400 text-xs break-words">{msg}</p>;
}
