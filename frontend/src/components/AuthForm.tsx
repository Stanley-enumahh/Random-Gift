"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, postJson } from "@/lib/api";
import { CheckIcon, EyeIcon, EyeOffIcon, GiftIcon, LockIcon, ShuffleIcon, UsersIcon } from "./icons";
import { Avatar, Button, ErrorText, Input, Spinner } from "./ui";

const FEATURES = [
  { icon: UsersIcon, title: "Invite with a code", body: "Share six characters and your circle is in." },
  { icon: ShuffleIcon, title: "One-tap draw", body: "Everyone gets exactly one person. No one draws themselves." },
  { icon: LockIcon, title: "Truly secret", body: "You see who you're gifting. Never who's gifting you." },
];

// Mirrors the Django password validators that can be checked client-side.
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Not only numbers", test: (p: string) => p.length > 0 && !/^\d+$/.test(p) },
];

function BrandMark() {
  return (
    <Link href="/login" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <GiftIcon />
      </span>
      <span className="text-lg font-semibold tracking-tight">Gift Circle</span>
    </Link>
  );
}

function PreviewCard() {
  return (
    <div className="relative w-72 rotate-[-4deg] rounded-3xl bg-white/[0.08] p-5 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/50">
        <LockIcon width={12} height={12} /> Only you can see this
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-200">You&apos;re gifting</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-brand-200">
          <GiftIcon />
        </span>
        <span className="select-none text-2xl font-semibold blur-[6px]">Jordan Lee</span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex -space-x-2">
          {["Ada Obi", "Sam Park", "Rita Moreno", "Kofi Mensah"].map((n) => (
            <Avatar key={n} name={n} size="sm" className="ring-2 ring-ink" />
          ))}
        </div>
        <span className="text-xs text-white/50">Office Secret Santa</span>
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  function clearFieldError(name: string) {
    if (fieldErrors[name]) setFieldErrors(({ [name]: _, ...rest }) => rest);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setPending(true);
    try {
      await postJson(`/api/auth/${mode}`, Object.fromEntries(new FormData(e.currentTarget)));
      // Only follow same-site paths so ?next= can't send people elsewhere.
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError((err as Error).message);
      setFieldErrors(apiErr.fields);
      if (Object.keys(apiErr.fields).length === 0) setError(apiErr.message);
      setPending(false);
    }
  }

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href + nextQuery}
      replace
      className={`flex-1 rounded-full py-2 text-center text-sm font-medium transition ${
        active ? "bg-white text-ink shadow-card" : "text-ink-3 hover:text-ink"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative">
          <BrandMark />
        </div>

        <div className="relative grid grid-cols-[1fr_auto] items-center gap-10 xl:gap-16">
          <div>
            <h2 className="max-w-md text-5xl font-semibold leading-[1.05] tracking-tight">
              The gift exchange,
              <br />
              <span className="text-white/45">beautifully secret.</span>
            </h2>
            <ul className="mt-12 space-y-6">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                    <Icon />
                  </span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-white/55">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden xl:block">
            <PreviewCard />
          </div>
        </div>

        <p className="relative text-xs text-white/40">Made for families, friends and offices.</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-brand-50/70 to-transparent lg:hidden" />
        <div className="relative w-full max-w-[380px]">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          <div className="flex rounded-full bg-black/[0.04] p-1">
            {tab("/login", "Log in", !isSignup)}
            {tab("/signup", "Sign up", isSignup)}
          </div>

          <h1 className="mt-8 text-[28px] font-semibold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1.5 text-ink-3">
            {isSignup ? "Start a circle or join one in under a minute." : "Log in to see your circles and who you're gifting."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {isSignup && (
              <Input
                label="Name"
                name="name"
                required
                autoFocus
                autoComplete="name"
                placeholder="What should your group call you?"
                error={fieldErrors.name}
                onChange={() => clearFieldError("name")}
              />
            )}
            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoFocus={!isSignup}
              autoComplete="email"
              placeholder="you@example.com"
              error={fieldErrors.email}
              onChange={() => clearFieldError("email")}
            />
            <Input
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "Create a password" : "Your password"}
              error={fieldErrors.password}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError("password");
              }}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded-lg p-2 text-ink-3 transition hover:bg-black/5 hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon width={17} height={17} /> : <EyeIcon width={17} height={17} />}
                </button>
              }
            />

            {isSignup && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-emerald-600" : "text-ink-3"}`}>
                      <span
                        className={`flex size-4 items-center justify-center rounded-full transition-colors ${ok ? "bg-emerald-500 text-white" : "bg-black/[0.06]"}`}
                      >
                        {ok && <CheckIcon width={10} height={10} strokeWidth={3} />}
                      </span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}

            <ErrorText>{error}</ErrorText>

            <Button type="submit" disabled={pending} className="!mt-6 h-12 w-full text-[15px]">
              {pending && <Spinner />}
              {pending ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create account" : "Log in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-3">
            {isSignup ? "Already have an account? " : "New to Gift Circle? "}
            <Link href={(isSignup ? "/login" : "/signup") + nextQuery} replace className="font-medium text-brand-600 hover:text-brand-700">
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
