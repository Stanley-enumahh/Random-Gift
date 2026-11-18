import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname) || request.cookies.has("gift_token")) {
    return NextResponse.next();
  }
  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes (they check auth themselves) and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
