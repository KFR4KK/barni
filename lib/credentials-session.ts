import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { authAdapter } from "@/lib/auth";

// See lib/auth.ts's top comment for *why* this exists: Auth.js's
// Credentials provider doesn't work with the "database" session
// strategy, so email+password sign-in creates its Session row through
// this same adapter directly, then sets the exact cookie Auth.js itself
// reads on every later request via auth(). After this runs, there is no
// difference — in the database or in the cookie — between a session
// that came from here and one that came from Discord/Google/Telegram.

// Auth.js v5's default session cookie name and lifetime for the
// "database" strategy (see this app's own middleware.ts, which already
// checks both the dev and prod cookie names below — this mirrors that
// exact list rather than introducing a third name to keep in sync).
const COOKIE_NAME_DEV = "authjs.session-token";
const COOKIE_NAME_PROD = "__Secure-authjs.session-token";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days — Auth.js's own default

export async function createDatabaseSessionForUser(userId: string): Promise<void> {
  if (!authAdapter.createSession) {
    throw new Error("createDatabaseSessionForUser: adapter has no createSession — check lib/auth.ts");
  }

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await authAdapter.createSession({ sessionToken, userId, expires });

  const isProduction = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set(isProduction ? COOKIE_NAME_PROD : COOKIE_NAME_DEV, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    expires,
  });
}
