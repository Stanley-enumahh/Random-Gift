import Link from "next/link";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { Greeting, RelativeTime, RevealName, TodayLabel } from "@/components/client-bits";
import { CreateGroupDialog, JoinGroupDialog } from "@/components/GroupForms";
import { ChevronRightIcon, CrownIcon, GiftIcon, GridIcon, LockIcon, ShuffleIcon, SparklesIcon, UsersIcon } from "@/components/icons";
import JoinsChart from "@/components/JoinsChart";
import PhonePrompt from "@/components/PhonePrompt";
import { Avatar, AvatarStack, Badge, Card, CardHeader, Progress } from "@/components/ui";
import { getAsUser, type Activity, type Dashboard, type DashboardGroup, type User } from "@/lib/backend";

// A sleeping Render free instance can take ~50s to answer the first request.
export const maxDuration = 60;

export default async function DashboardPage() {
  const [me, data] = await Promise.all([getAsUser<User>("/api/auth/me/"), getAsUser<Dashboard>("/api/dashboard/")]);
  const user = me!;
  const { stats, groups, activity, joins_by_day, min_members } = data!;
  const assigned = groups.filter((g) => g.my_receiver);

  return (
    <AppShell user={user} groups={groups.map((g) => ({ id: g.id, name: g.name, drawn: !!g.drawn_at }))}>
      {user.show_phone_prompt && <PhonePrompt />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-3">
            <TodayLabel />
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-[34px]">
            <Greeting name={user.name} />
          </h1>
        </div>
        {/* Two equal columns on phones so neither label wraps; natural width from sm up. */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <JoinGroupDialog className="w-full max-sm:px-3! sm:w-auto" />
          <CreateGroupDialog className="w-full max-sm:px-3! sm:w-auto" />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<GridIcon />} label="Groups" value={stats.groups} hint={`${stats.admin_of} you admin`} />
            <StatCard icon={<UsersIcon />} label="People in your circles" value={stats.people} hint="Across all groups" />
            <StatCard
              icon={<ShuffleIcon />}
              label="Names drawn"
              value={`${stats.drawn}/${stats.groups}`}
              hint={stats.awaiting_draw ? `${stats.awaiting_draw} waiting to draw` : "All groups drawn"}
            />
            <StatCard icon={<GiftIcon />} label="Gifts to buy" value={stats.gifting} hint="People you're gifting" accent />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="p-0">
                <div className="px-6 pt-6">
                  <CardHeader title="Your groups" subtitle={`${groups.length} group${groups.length === 1 ? "" : "s"}`} />
                </div>
                <ul className="divide-y divide-line border-t border-line">
                  {groups.map((g) => (
                    <GroupRow key={g.id} group={g} minMembers={min_members} />
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader title="Member growth" subtitle="People joining your groups, last 14 days" />
                <JoinsChart days={joins_by_day} />
              </Card>
            </div>

            <div className="space-y-6">
              <SecretCard groups={assigned} />
              <Card>
                <CardHeader title="Recent activity" />
                {activity.length === 0 ? (
                  <p className="text-sm text-ink-3">Nothing yet.</p>
                ) : (
                  <ol className="relative space-y-5 before:absolute before:inset-y-2 before:left-[17px] before:w-px before:bg-line">
                    {activity.map((a, i) => (
                      <ActivityItem key={i} item={a} me={user.id} />
                    ))}
                  </ol>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function StatCard({ icon, label, value, hint, accent = false }: { icon: ReactNode; label: string; value: ReactNode; hint: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-linear-to-br from-brand-500 to-brand-700 text-white ring-0" : ""}`}>
      <div className={`flex size-9 items-center justify-center rounded-xl ${accent ? "bg-white/15" : "bg-canvas text-ink-2"}`}>{icon}</div>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      <p className={`mt-2 text-sm font-medium ${accent ? "text-white" : "text-ink"}`}>{label}</p>
      <p className={`mt-0.5 text-xs ${accent ? "text-white/70" : "text-ink-3"}`}>{hint}</p>
    </Card>
  );
}

function GroupRow({ group: g, minMembers }: { group: DashboardGroup; minMembers: number }) {
  const ready = g.member_count >= minMembers;
  return (
    <li>
      <Link href={`/groups/${g.id}`} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-canvas/60">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-50 to-brand-100 text-base font-semibold text-brand-700">
          {g.name[0]?.toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{g.name}</p>
            {g.is_owner && (
              <span title="You're the admin">
                <CrownIcon width={14} height={14} className="shrink-0 text-amber-500" />
                <span className="sr-only">You&apos;re the admin</span>
              </span>
            )}
          </div>
          {g.drawn_at ? (
            <p className="mt-0.5 text-sm text-ink-3">
              {g.member_count} members · drawn <RelativeTime iso={g.drawn_at} />
            </p>
          ) : (
            <div className="mt-2 flex max-w-56 items-center gap-3">
              <Progress value={g.member_count} max={minMembers} />
              <span className="shrink-0 text-xs tabular-nums text-ink-3">
                {ready ? `${g.member_count} ready` : `${g.member_count}/${minMembers}`}
              </span>
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <AvatarStack names={g.members_preview.map((m) => m.name)} total={g.member_count} />
        </div>
        <div className="hidden w-28 justify-end md:flex">
          {g.drawn_at ? (
            <Badge tone="green">Drawn</Badge>
          ) : ready ? (
            <Badge tone="brand">Ready to draw</Badge>
          ) : g.code ? (
            <span className="rounded-lg bg-canvas px-2 py-1 font-mono text-xs tracking-wider text-ink-2">{g.code}</span>
          ) : (
            <Badge tone="amber">Open</Badge>
          )}
        </div>
        <ChevronRightIcon className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

function SecretCard({ groups }: { groups: DashboardGroup[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-lift">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[13px] font-medium text-white/60">
          <LockIcon width={14} height={14} /> Only you can see this
        </div>
        <h2 className="mt-1 text-[17px] font-semibold tracking-tight">Your secret assignments</h2>

        {groups.length === 0 ? (
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            Once the admin starts the random draw, the person you&apos;re gifting will show up here.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {groups.map((g) => (
              <li key={g.id} className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                <p className="text-xs text-white/50">{g.name}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <GiftIcon className="shrink-0 text-brand-200" />
                  <span className="text-lg font-semibold">
                    <RevealName name={g.my_receiver!.name} dark />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ item, me }: { item: Activity; me: number }) {
  const who = item.user ? (item.user.id === me ? "You" : item.user.name) : null;
  const text =
    item.kind === "drawn" ? (
      <>Names were drawn in <b className="font-medium text-ink">{item.group.name}</b></>
    ) : item.kind === "created" ? (
      <><b className="font-medium text-ink">{who}</b> created <b className="font-medium text-ink">{item.group.name}</b></>
    ) : (
      <><b className="font-medium text-ink">{who}</b> joined <b className="font-medium text-ink">{item.group.name}</b></>
    );

  return (
    <li className="relative flex gap-3">
      {item.user ? (
        <Avatar name={item.user.name} className="relative ring-4 ring-white" />
      ) : (
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
          <SparklesIcon width={16} height={16} />
        </span>
      )}
      <div className="min-w-0 pt-0.5">
        <p className="text-sm leading-snug text-ink-2">{text}</p>
        <p className="mt-0.5 text-xs text-ink-3">
          <RelativeTime iso={item.at} />
        </p>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <Card className="mt-8 overflow-hidden p-0">
      <div className="relative px-6 py-16 text-center sm:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-100 blur-3xl" />
        <div className="relative mx-auto flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-lift">
          <GiftIcon width={28} height={28} />
        </div>
        <h2 className="relative mt-6 text-2xl font-semibold tracking-tight">Start your first gift circle</h2>
        <p className="relative mx-auto mt-2 max-w-md text-ink-3">
          Create a group and share the code, or join one a friend started. Once {`there's`} at least four of you, the admin starts a random draw.
        </p>
        {/* Stacked full-width buttons on phones, side by side from sm up. */}
        <div className="relative mx-auto mt-8 flex max-w-xs flex-col-reverse gap-2 sm:max-w-none sm:flex-row sm:justify-center">
          <JoinGroupDialog className="h-11! w-full sm:w-auto" />
          <CreateGroupDialog className="h-11! w-full sm:w-auto" />
        </div>
      </div>
    </Card>
  );
}
