import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Foundation-phase middleware.
//
// No routes are protected yet — this phase only establishes sign-in /
// sign-out. When a later phase adds real protected routes (profile
// editing, the admin panel), add their path prefixes to
// PROTECTED_PATH_PREFIXES below and they're covered immediately.
//
// This only checks for the *presence* of the session cookie, as a fast
// redirect-to-sign-in for a nicer UX. It deliberately does NOT validate
// the session against the database — Edge middleware shouldn't make that
// round trip on every request, and it doesn't need to: real authorization
// always happens server-side in the page or Server Action itself (see the
// architecture blueprint, Section 4 — "middleware is UX, the Server
// Action check is security"). A forged or stale cookie would pass this
// check but fail the real one immediately afterward.
const PROTECTED_PATH_PREFIXES: string[] = [
  // "/profile/edit",
  // "/admin",
];

const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  if (!hasSessionCookie) {
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("signin", "required");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// Matcher stays scoped to the (currently empty) protected prefixes above
// rather than matching every route — no reason to run this on every
// static asset or public page.
export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
