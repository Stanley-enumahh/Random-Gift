// Server-only helpers for talking to the Django API.
// The auth token lives in an httpOnly cookie; the browser never sees it.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const DEV_API_URL = "http://127.0.0.1:8000";

function apiUrl() {
  const url = process.env.DJANGO_API_URL?.replace(/\/+$/, "");
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DJANGO_API_URL is not set. Add it in the Vercel project's environment variables.");
  }
  return DEV_API_URL;
}

export const TOKEN_COOKIE = "gift_token";

// Shown when Django can't be reached, e.g. while a sleeping Render free instance wakes up.
export const UNAVAILABLE = { detail: "The server is waking up. Please try again in a few seconds." };

// Django returns HTML on crashes; never let that blow up a JSON parse.
export async function readJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({ detail: "Something went wrong on the server." }));
}

export type User = { id: number; email: string; name: string };

export type GroupSummary = {
  id: number;
  name: string;
  code: string;
  member_count: number;
  is_owner: boolean;
  drawn_at: string | null;
};

export type Person = { id: number; name: string };

export type GroupDetail = GroupSummary & {
  owner: Person;
  members: Person[];
  my_receiver: Person | null;
  min_members: number;
  next_draw_at: string | null;
  can_draw: boolean;
};

export type DashboardGroup = {
  id: number;
  name: string;
  code: string;
  is_owner: boolean;
  member_count: number;
  members_preview: Person[];
  drawn_at: string | null;
  next_draw_at: string | null;
  my_receiver: Person | null;
};

export type Activity = {
  kind: "created" | "joined" | "drawn";
  at: string;
  user: Person | null;
  group: { id: number; name: string };
};

export type Dashboard = {
  stats: { groups: number; admin_of: number; drawn: number; awaiting_draw: number; people: number; gifting: number };
  min_members: number;
  groups: DashboardGroup[];
  activity: Activity[];
  joins_by_day: { date: string; count: number }[];
};

export function djangoFetch(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Token ${token}`);
  return fetch(`${apiUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

// For server components: fetch as the signed-in user, bounce to /login if the token is bad.
export async function getAsUser<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/login");
  const res = await djangoFetch(path, {}, token);
  if (res.status === 401) redirect("/login");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return res.json();
}
