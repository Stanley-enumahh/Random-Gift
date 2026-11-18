"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./ui";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  icon,
  title,
  body,
  confirmLabel,
  pendingLabel = "Please wait…",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  icon: ReactNode;
  title: string;
  body: string;
  confirmLabel: string;
  pendingLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && !pending && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-0 shadow-lift"
    >
      <div className="p-7 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-ink-3">{body}</p>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button variant="accent" onClick={confirm} disabled={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
