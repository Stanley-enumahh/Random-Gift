"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, sendJson } from "@/lib/api";
import type { User } from "@/lib/backend";
import { CheckIcon, PhoneIcon, UsersIcon } from "./icons";
import { Avatar, Button, Card, CardHeader, ErrorText, Input, Spinner } from "./ui";

export default function SettingsForm({ user }: { user: User }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState({ name: user.name, phone: user.phone });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = name.trim() !== saved.name || phone.trim() !== saved.phone;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setPending(true);
    try {
      const me = await sendJson<User>("PATCH", "/api/backend/auth/me", { name, phone });
      setName(me.name);
      setPhone(me.phone);
      setSaved({ name: me.name, phone: me.phone });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      router.refresh(); // the sidebar shows the name too
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError((err as Error).message);
      setFieldErrors(apiErr.fields);
      if (Object.keys(apiErr.fields).length === 0) setError(apiErr.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader title="Profile" subtitle="This is how you appear to people in your groups." />
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={name.trim() || user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{name.trim() || user.name}</p>
            <p className="truncate text-sm text-ink-3">{user.email}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={150}
            autoComplete="name"
            error={fieldErrors.name}
          />
          <Input label="Email" name="email" value={user.email} disabled readOnly className="cursor-not-allowed text-ink-3" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Phone number" subtitle="So people in your groups can reach you about the exchange." />
        <div className="flex items-start gap-4">
          <span className="mt-6 hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:flex">
            <PhoneIcon />
          </span>
          <div className="flex-1">
            <Input
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+234 801 234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={25}
              error={fieldErrors.phone}
            />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
              <UsersIcon width={12} height={12} /> Visible to members of your groups. Never shown to anyone else.
            </p>
          </div>
        </div>
      </Card>

      <ErrorText>{error}</ErrorText>

      <div className="flex items-center justify-end gap-3">
        {justSaved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckIcon width={16} height={16} /> Saved
          </span>
        )}
        <Button type="submit" disabled={!dirty || pending} className="h-11 min-w-32">
          {pending && <Spinner />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
