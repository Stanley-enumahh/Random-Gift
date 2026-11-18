import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { djangoFetch, readJson, TOKEN_COOKIE, UNAVAILABLE } from "@/lib/backend";

// A sleeping Render free instance can take ~50s to answer the first request.
export const maxDuration = 60;

const ACTIONS = new Set(["login", "signup", "logout"]);

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ACTIONS.has(action)) return NextResponse.json({ detail: "Not found." }, { status: 404 });

  const jar = await cookies();

  if (action === "logout") {
    const token = jar.get(TOKEN_COOKIE)?.value;
    // Revoke the token if we can, but always sign the browser out.
    if (token) await djangoFetch("/api/auth/logout/", { method: "POST" }, token).catch(() => null);
    jar.delete(TOKEN_COOKIE);
    return new NextResponse(null, { status: 204 });
  }

  let res: Response;
  try {
    res = await djangoFetch(`/api/auth/${action}/`, { method: "POST", body: await request.text() });
  } catch {
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
  const data = await readJson(res);
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  jar.set(TOKEN_COOKIE, data.token as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ user: data.user }, { status: res.status });
}
