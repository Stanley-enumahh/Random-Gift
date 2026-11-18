"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { postJson } from "@/lib/api";
import type { GroupDetail } from "@/lib/backend";
import { PlusIcon, TicketIcon } from "./icons";
import { Button, ErrorText, Input } from "./ui";

type FormSpec = {
  trigger: ReactNode;
  triggerVariant: "primary" | "secondary";
  icon: ReactNode;
  title: string;
  subtitle: string;
  label: string;
  field: string;
  placeholder: string;
  action: string;
  url: string;
  triggerClassName?: string;
};

function GroupDialog(spec: FormSpec) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const group = await postJson<GroupDetail>(spec.url, Object.fromEntries(new FormData(e.currentTarget)));
      dialog.current?.close();
      router.push(`/groups/${group.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant={spec.triggerVariant} className={spec.triggerClassName} onClick={() => dialog.current?.showModal()}>
        {spec.trigger}
      </Button>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 shadow-lift"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <form onSubmit={onSubmit} className="space-y-5 p-7">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{spec.icon}</div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{spec.title}</h2>
            <p className="mt-1 text-sm text-ink-3">{spec.subtitle}</p>
          </div>
          <Input
            label={spec.label}
            name={spec.field}
            placeholder={spec.placeholder}
            required
            autoFocus
            maxLength={spec.field === "code" ? 20 : 100}
            className={spec.field === "code" ? "font-mono uppercase tracking-[0.25em]" : ""}
          />
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Please wait…" : spec.action}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function CreateGroupDialog({ className }: { className?: string }) {
  return (
    <GroupDialog
      triggerClassName={className}
      trigger={<><PlusIcon width={16} height={16} /> New group</>}
      triggerVariant="primary"
      icon={<PlusIcon width={22} height={22} />}
      title="Start a group"
      subtitle="You'll get an invite code to share. You're the admin and you're in the draw too."
      label="Group name"
      field="name"
      placeholder="e.g. Office Secret Santa"
      action="Create group"
      url="/api/backend/groups"
    />
  );
}

export function JoinGroupDialog({ className }: { className?: string }) {
  return (
    <GroupDialog
      triggerClassName={className}
      trigger={<><TicketIcon width={16} height={16} /> Join with code</>}
      triggerVariant="secondary"
      icon={<TicketIcon width={22} height={22} />}
      title="Join a group"
      subtitle="Enter the 6-character code the group admin shared with you."
      label="Invite code"
      field="code"
      placeholder="ABC123"
      action="Join group"
      url="/api/backend/groups/join"
    />
  );
}
