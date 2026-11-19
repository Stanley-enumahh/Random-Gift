import AppShell from "@/components/AppShell";
import SettingsForm from "@/components/SettingsForm";
import { getAsUser, type GroupSummary, type User } from "@/lib/backend";

export const maxDuration = 60;

export default async function SettingsPage() {
  const [me, groups] = await Promise.all([getAsUser<User>("/api/auth/me/"), getAsUser<GroupSummary[]>("/api/groups/")]);

  return (
    <AppShell user={me!} groups={groups!.map((g) => ({ id: g.id, name: g.name, drawn: !!g.drawn_at }))}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[34px]">Settings</h1>
        <p className="mt-1 text-ink-3">Manage your name and contact details.</p>
        <div className="mt-8">
          <SettingsForm user={me!} />
        </div>
      </div>
    </AppShell>
  );
}
