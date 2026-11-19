import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { CopyCode, RevealName } from "@/components/client-bits";
import { AdminPanel, RemoveMemberButton } from "@/components/GroupActions";
import { ArrowLeftIcon, ClockIcon, CrownIcon, GiftIcon, LockIcon, PhoneIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { getAsUser, type GroupDetail, type GroupSummary, type User } from "@/lib/backend";

export const maxDuration = 60;

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const [me, group, groups] = await Promise.all([
    getAsUser<User>("/api/auth/me/"),
    getAsUser<GroupDetail>(`/api/groups/${id}/`),
    getAsUser<GroupSummary[]>("/api/groups/"),
  ]);
  if (!group) notFound();
  const user = me!;
  const isDrawn = group.drawn_at !== null;

  return (
    <AppShell user={user} groups={groups!.map((g) => ({ id: g.id, name: g.name, drawn: !!g.drawn_at }))}>
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
        <ArrowLeftIcon width={16} height={16} /> Overview
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-linear-to-br from-brand-50 to-brand-100 text-2xl font-semibold text-brand-700">
            {group.name[0]?.toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>
              {isDrawn ? <Badge tone="green">Drawn</Badge> : <Badge tone="amber">Open</Badge>}
            </div>
            <p className="mt-1 text-sm text-ink-3">
              {group.members.length} member{group.members.length === 1 ? "" : "s"} · Admin: {group.owner.id === user.id ? "you" : group.owner.name}
            </p>
          </div>
        </div>
        {!isDrawn && group.code && (
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-3">Invite code</span>
            <CopyCode code={group.code} />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {group.my_receiver ? (
            <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white shadow-lift sm:p-10">
              <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-brand-500/35 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-10 size-60 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[13px] font-medium text-white/60">
                  <LockIcon width={14} height={14} /> Only you can see this
                </div>
                <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-brand-200">You&apos;re gifting</p>
                <div className="mt-3 flex items-center gap-4">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/15">
                    <GiftIcon width={26} height={26} />
                  </span>
                  <span className="text-4xl font-semibold tracking-tight sm:text-5xl">
                    <RevealName name={group.my_receiver.name} dark />
                  </span>
                </div>
                <p className="mt-6 max-w-sm text-sm text-white/60">Keep it secret. Nobody, not even the admin, can see who is gifting whom.</p>
              </div>
            </div>
          ) : (
            <Card className="flex items-center gap-5 p-8">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <ClockIcon width={24} height={24} />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Waiting for the draw</h2>
                <p className="mt-1 text-sm text-ink-3">
                  When {group.is_owner ? "you start" : `${group.owner.name} starts`} the draw, everyone is paired at random and
                  you&apos;ll see who you&apos;re gifting right here. Nobody picks who gets whom.
                </p>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Members" subtitle={`${group.members.length} in this circle`} />
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-canvas/70 p-3">
                  <Avatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {m.id === user.id && <span className="font-normal text-ink-3"> (you)</span>}
                    </p>
                    {m.phone ? (
                      <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-brand-600">
                        <PhoneIcon width={12} height={12} /> {m.phone}
                      </a>
                    ) : (
                      <p className="text-xs text-ink-3">{m.id === group.owner.id ? "Admin" : "Member"} · no phone yet</p>
                    )}
                  </div>
                  {m.id === group.owner.id ? (
                    <span title="Admin">
                      <CrownIcon width={16} height={16} className="text-amber-500" />
                    </span>
                  ) : (
                    group.is_owner && <RemoveMemberButton groupId={group.id} member={m} isDrawn={isDrawn} />
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {group.is_owner && <AdminPanel group={group} />}
          <Card>
            <CardHeader title="How it works" />
            <ol className="space-y-4 text-sm">
              {[
                ["Invite", `The admin shares the invite code. At least ${group.min_members} people need to join.`],
                ["Draw", "The admin starts the draw and names are shuffled at random. No one chooses the pairs, not even the admin."],
                ["Gift", "You only see who you're gifting, never who's gifting you."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
                  <p className="text-ink-2">
                    <span className="font-medium text-ink">{title}.</span> {body}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
