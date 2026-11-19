"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, postJson, sendJson } from "@/lib/api";
import { PhoneIcon, UsersIcon } from "./icons";
import { Button, Input, Spinner } from "./ui";

// Shown on the dashboard when the server says it's time to ask (no number yet,
// and not dismissed in the last 7 days). "Not now" snoozes it on the server.
export default function PhonePrompt() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const handled = useRef(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // A short delay so it doesn't pop up before the page has settled.
    const t = setTimeout(() => dialog.current?.showModal(), 1200);
    return () => clearTimeout(t);
  }, []);

  function snooze() {
    if (handled.current) return;
    handled.current = true;
    postJson("/api/backend/auth/me/dismiss-phone-prompt").catch(() => null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await sendJson("PATCH", "/api/backend/auth/me", { phone });
      handled.current = true;
      dialog.current?.close();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields.phone ?? err.message) : (err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      // Esc, backdrop click and "Not now" all count as "ask me later".
      onClose={snooze}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 shadow-lift"
    >
      <form onSubmit={save} className="p-7">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <PhoneIcon width={22} height={22} />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">Add your phone number</h2>
        <p className="mt-1.5 text-sm text-ink-3">So people in your groups can reach you about the exchange. It takes a few seconds.</p>

        <div className="mt-6">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            maxLength={25}
            required
            error={error}
          />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
            <UsersIcon width={12} height={12} className="shrink-0" /> Only members of your groups can see it. Change it anytime in{" "}
            <Link href="/settings" className="font-medium text-brand-600 hover:text-brand-700">
              Settings
            </Link>
            .
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => dialog.current?.close()} disabled={pending}>
            Not now
          </Button>
          <Button type="submit" disabled={pending || !phone.trim()}>
            {pending && <Spinner />}
            {pending ? "Saving…" : "Save number"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
