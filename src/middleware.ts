import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(request: NextRequest) {
  const hasSession = SESSION_COOKIE_NAMES.some((cookieName) => request.cookies.has(cookieName));

  if (hasSession) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/", "/admin/:path*", "/items/:path*"],
};
