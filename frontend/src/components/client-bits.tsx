"use client";

// Small client-only pieces. Anything that depends on the viewer's clock or
// timezone renders after mount so it matches the viewer, not the server.
import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon } from "./icons";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function Greeting({ name }: { name: string }) {
  const mounted = useMounted();
  const hour = mounted ? new Date().getHours() : 12;
  const part = !mounted ? "Welcome back" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <>
      {part}, {name.split(" ")[0]}
    </>
  );
}

export function TodayLabel() {
  const mounted = useMounted();
  if (!mounted) return <>&nbsp;</>;
  return <>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</>;
}

export function LocalTime({ iso }: { iso: string }) {
  const mounted = useMounted();
  if (!mounted) return <time dateTime={iso}>…</time>;
  return <time dateTime={iso}>{new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export function RelativeTime({ iso }: { iso: string }) {
  const mounted = useMounted();
  if (!mounted) return <time dateTime={iso}>…</time>;
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const fmt = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ["second", 1];
  const text = unit === "second" ? "just now" : fmt.format(Math.round(seconds / size), unit);
  return <time dateTime={iso}>{text}</time>;
}

// Counts down to the redraw time and reloads the button state when it hits zero.
export function Countdown({ iso, onDone }: { iso: string; onDone?: () => void }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? null : Math.max(0, new Date(iso).getTime() - now);
  const done = left === 0;
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);
  if (left === null) return <span>…</span>;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <span className="tabular-nums">
      {h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}

export function RevealName({ name, dark = false }: { name: string; dark?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      onClick={() => setShown((s) => !s)}
      className="group/reveal relative inline-flex items-center gap-2 text-left"
      title={shown ? "Hide" : "Tap to reveal"}
    >
      <span className={`transition-all duration-300 ${shown ? "" : "select-none blur-md"}`}>{name}</span>
      {!shown && (
        <span
          className={`absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-medium ${dark ? "text-white/80" : "text-ink-2"}`}
        >
          <EyeIcon width={14} height={14} /> Reveal
        </span>
      )}
    </button>
  );
}

export function CopyCode({ code, size = "lg" }: { code: string; size?: "sm" | "lg" }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (size === "sm") {
    return (
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-mono text-xs tracking-wider text-ink-2 hover:text-ink"
        title="Copy invite code"
      >
        {code}
        {copied ? <CheckIcon width={12} height={12} className="text-emerald-600" /> : <CopyIcon width={12} height={12} />}
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      className="group inline-flex items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-card ring-1 ring-black/5 transition hover:shadow-lift"
      title="Copy invite code"
    >
      <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-ink">{code}</span>
      <span
        className={`flex size-9 items-center justify-center rounded-full transition ${
          copied ? "bg-emerald-50 text-emerald-600" : "bg-canvas text-ink-2 group-hover:text-ink"
        }`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  );
}
