"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, isPasswordValid, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { createDatabaseSessionForUser } from "@/lib/credentials-session";

// Account Linking, section 1 — Email + password sign-up/sign-in. Kept as
// plain Server Actions rather than a NextAuth Credentials provider — see
// lib/auth.ts's top comment for why. Both actions return a
// `{ error: string }` shape instead of throwing, since app/login/page.tsx
// needs a message to show the person, not a crashed request; both
// `redirect()` on success, same as every other Server Action in this app
// (see actions/profile.ts).

export interface CredentialsActionResult {
  error?: string;
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// New account, email+password only. Does NOT set `username` — same rule
// as every OAuth provider now follows (see lib/username.ts and
// lib/auth.ts's comment): the person chooses it at /onboarding/username
// right after this, never auto-filled from the email address.
export async function registerWithPassword(
  _prevState: CredentialsActionResult,
  formData: FormData
): Promise<CredentialsActionResult> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { error: "Введіть коректний email." };
  }
  if (!isPasswordValid(password)) {
    return { error: `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів.` };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Section 12.4 — "user tries to register with an existing email".
    // Deliberately specific here (unlike a login failure, which stays
    // generic — see signInWithPassword below): this is the sign-UP form,
    // so confirming the email is taken is the same information a "check
    // your inbox" flow would leak anyway, and pointing them at signing
    // in instead is much more useful than a vague failure.
    return { error: "Цей email вже зареєстровано. Спробуйте увійти." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true },
  });

  await createDatabaseSessionForUser(user.id);
  redirect("/welcome");
}

export async function signInWithPassword(
  _prevState: CredentialsActionResult,
  formData: FormData
): Promise<CredentialsActionResult> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  // Deliberately the same generic message for "no such email" and
  // "wrong password" — confirming which one it was tells an attacker
  // whether an email is registered at all.
  const genericError = "Невірний email або пароль.";
  if (!email || !password) {
    return { error: genericError };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // No account, or an account that exists but has never set a password
  // (e.g. Discord/Google/Telegram-only) — both look identical to the
  // person entering a password here, and both should get the same
  // generic error rather than "this account has no password set",
  // which would leak that the email is real.
  if (!user || !user.passwordHash) {
    return { error: genericError };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: genericError };
  }

  await createDatabaseSessionForUser(user.id);
  redirect("/welcome");
}
