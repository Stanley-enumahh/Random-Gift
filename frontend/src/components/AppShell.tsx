"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { postJson } from "@/lib/api";
import type { User } from "@/lib/backend";
import ConfirmDialog from "./ConfirmDialog";
import { GiftIcon, GridIcon, LogoutIcon } from "./icons";
import { Avatar } from "./ui";

type NavGroup = { id: number; name: string; drawn: boolean };

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <GiftIcon width={17} height={17} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Gift Circle</span>
    </Link>
  );
}

function NavItem({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
        active ? "bg-black/[0.05] font-medium text-ink" : "text-ink-2 hover:bg-black/[0.03] hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function useLogout() {
  const router = useRouter();
  return async () => {
    await postJson("/api/auth/logout");
    router.replace("/login");
    router.refresh();
  };
}

export default function AppShell({ user, groups, children }: { user: User; groups: NavGroup[]; children: ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const askLogout = () => setConfirmingLogout(true);

  return (
    <div className="lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-8 space-y-1">
          <NavItem href="/" active={pathname === "/"}>
            <GridIcon className="text-ink-3" /> Overview
          </NavItem>
        </nav>

        <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Your groups</p>
        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto">
          {groups.length === 0 && <p className="px-3 py-2 text-sm text-ink-3">No groups yet</p>}
          {groups.map((g) => (
            <NavItem key={g.id} href={`/groups/${g.id}`} active={pathname === `/groups/${g.id}`}>
              <span className={`size-2 shrink-0 rounded-full ${g.drawn ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className="truncate">{g.name}</span>
            </NavItem>
          ))}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-3">{user.email}</p>
          </div>
          <button onClick={askLogout} className="rounded-lg p-1.5 text-ink-3 hover:bg-white hover:text-ink" title="Log out">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <button onClick={askLogout} className="rounded-lg p-2 text-ink-2 hover:bg-canvas" title="Log out">
          <LogoutIcon />
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>

      <ConfirmDialog
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={logout}
        icon={<LogoutIcon width={22} height={22} />}
        title="Log out?"
        body={`You're signed in as ${user.email}. You can log back in anytime.`}
        confirmLabel="Log out"
        pendingLabel="Logging out…"
      />
    </div>
  );
}
