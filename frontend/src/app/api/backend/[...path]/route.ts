// Forwards browser requests to Django, attaching the token from the httpOnly cookie.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { djangoFetch, readJson, TOKEN_COOKIE, UNAVAILABLE } from "@/lib/backend";

// A sleeping Render free instance can take ~50s to answer the first request.
export const maxDuration = 60;

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(request: Request, { params }: Ctx) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });

  const { path } = await params;
  const body = request.method === "GET" ? undefined : await request.text();
  let res: Response;
  try {
    res = await djangoFetch(`/api/${path.join("/")}/`, { method: request.method, body: body || undefined }, token);
  } catch {
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await readJson(res), { status: res.status });
}

export { forward as GET, forward as POST };
