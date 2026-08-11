import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// Same cookie names middleware.ts and lib/credentials-session.ts already
// use — kept in one place conceptually via this shared constant list
// rather than a fourth copy.
const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

// Used by lib/auth.ts's `signIn` callback to detect "this OAuth sign-in
// was started by someone who was already signed in" (Account Linking,
// point 5/6) — the callback itself doesn't get handed the pre-existing
// session, only the account/profile Auth.js just resolved, so this reads
// the same request's cookie directly instead. Returns null for "nobody
// was signed in" as well as "session cookie present but expired/invalid"
// — both cases should be treated identically by any caller (no active
// user to link against).
export async function getActiveSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = SESSION_COOKIE_NAMES.map((name) => cookieStore.get(name)?.value).find(Boolean);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: { userId: true, expires: true },
  });
  if (!session || session.expires < new Date()) return null;

  return session.userId;
}
