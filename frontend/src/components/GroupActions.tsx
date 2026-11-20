"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ApiError, postJson, sendJson } from "@/lib/api";
import type { GroupDetail, Person } from "@/lib/backend";
import { defaultDeadline, localInputToIso, minDeadline, toLocalInputValue } from "@/lib/datetime";
import { Countdown, LocalTime } from "./client-bits";
import ConfirmDialog from "./ConfirmDialog";
import { ClockIcon, CrownIcon, ShuffleIcon, UserMinusIcon } from "./icons";
import { Button, ErrorText, Input, Progress } from "./ui";

export function RemoveMemberButton({ groupId, member, isDrawn }: { groupId: number; member: Person; isDrawn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setError("");
    try {
      await sendJson("DELETE", `/api/backend/groups/${groupId}/members/${member.id}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-ink-3 transition hover:bg-brand-50 hover:text-brand-600"
        title={`Remove ${member.name}`}
        aria-label={`Remove ${member.name} from the group`}
      >
        <UserMinusIcon width={17} height={17} />
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={remove}
        icon={<UserMinusIcon width={22} height={22} />}
        title={`Remove ${member.name}?`}
        body={
          error ||
          (isDrawn
            ? "Names have already been drawn, so this cancels the current draw. You'll need to start a new random draw. They won't be able to rejoin with the code."
            : "They'll leave the group and won't be able to rejoin with the invite code.")
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
      />
    </>
  );
}

function DeadlineEditor({ group }: { group: GroupDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [min, setMin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function startEditing() {
    setValue(group.join_deadline && !group.code_expired ? toLocalInputValue(new Date(group.join_deadline)) : defaultDeadline());
    setMin(minDeadline());
    setError("");
    setEditing(true);
  }

  async function save() {
    setError("");
    setPending(true);
    try {
      await sendJson("PATCH", `/api/backend/groups/${group.id}`, { join_deadline: localInputToIso(value) });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields.join_deadline ?? err.message) : (err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`mt-5 rounded-2xl p-4 ${group.code_expired ? "bg-brand-50/70" : "bg-canvas"}`}>
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-3">{group.code_expired ? "Code expired" : "Joining deadline"}</p>
            <p className="text-sm font-semibold">
              {group.join_deadline ? <LocalTime iso={group.join_deadline} /> : "No deadline"}
            </p>
          </div>
          <Button variant="secondary" onClick={startEditing} className="h-9! shrink-0 px-4!">
            {group.code_expired ? "Reopen" : "Change"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            label="New joining deadline"
            name="join_deadline"
            type="datetime-local"
            value={value}
            min={min}
            onChange={(e) => setValue(e.target.value)}
            error={error}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending} className="h-9!">
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !value} className="h-9!">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPanel({ group }: { group: GroupDetail }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const refresh = useCallback(() => router.refresh(), [router]);

  const isDrawn = group.drawn_at !== null;
  const count = group.members.length;
  const needed = group.min_members - count;
  const coolingDown = isDrawn && !group.can_draw && group.next_draw_at !== null;

  async function draw() {
    if (isDrawn && !confirm("Reshuffle names? Everyone will be paired again at random.")) return;
    setError("");
    setPending(true);
    try {
      await postJson(`/api/backend/groups/${group.id}/draw`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-[13px] font-medium text-amber-600">
        <CrownIcon width={14} height={14} /> Admin controls
      </div>

      {!isDrawn && (
        <>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight">
            {needed > 0 ? `${needed} more member${needed === 1 ? "" : "s"} needed` : "Ready to draw names"}
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            {needed > 0 && group.code_expired
              ? "The invite code expired before enough people joined. Move the deadline below to reopen it."
              : needed > 0
              ? `Share the invite code. You need at least ${group.min_members} people to draw.`
              :"Names are shuffled at random, so you won't choose who gets whom. Everyone, including you, gets one person to gift. The group then closes to new members."}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Progress value={count} max={group.min_members} />
            <span className="shrink-0 text-xs font-medium tabular-nums text-ink-2">
              {count}/{group.min_members}
            </span>
          </div>
          <DeadlineEditor group={group} />
        </>
      )}

      {isDrawn && (
        <>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight">Names are drawn</h2>
          <p className="mt-1 text-sm text-ink-3">
            Drawn <LocalTime iso={group.drawn_at!} />. A redraw reshuffles everyone at random.
          </p>
          {coolingDown && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-canvas p-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white text-ink-2 shadow-card">
                <ClockIcon />
              </span>
              <div>
                <p className="text-xs text-ink-3">Redraw unlocks in</p>
                <p className="text-sm font-semibold">
                  <Countdown iso={group.next_draw_at!} onDone={refresh} />
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-5 space-y-3">
        <Button variant={isDrawn ? "secondary" : "accent"} onClick={draw} disabled={!group.can_draw || pending} className="w-full">
          <ShuffleIcon width={16} height={16} />
          {pending ? "Shuffling…" : isDrawn ? "Reshuffle at random" : "Start random draw"}
        </Button>
        <ErrorText>{error}</ErrorText>
      </div>
    </div>
  );
}
