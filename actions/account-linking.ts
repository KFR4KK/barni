"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, isPasswordValid, MIN_PASSWORD_LENGTH } from "@/lib/password";

export interface AccountLinkingResult {
  error?: string;
}

// How many distinct ways a user can currently sign in: one per linked
// OAuth Account row, plus one more if they have a password set. Used by
// unlinkProvider below to enforce point 8 — never let the count reach
// zero.
async function countSignInMethods(userId: string): Promise<number> {
  const [accountCount, user] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } }),
  ]);
  return accountCount + (user?.passwordHash ? 1 : 0);
}

// Account Linking, point 8 — "не позволяй пользователю удалить последний
// способ входа". Checked here (not just left to the person to notice),
// since the whole point is that they should never be able to lock
// themselves out, not just be warned after the fact.
export async function unlinkProvider(provider: string): Promise<AccountLinkingResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Потрібно увійти в акаунт." };
  }

  const methodCount = await countSignInMethods(session.user.id);
  if (methodCount <= 1) {
    return { error: "Це єдиний спосіб входу — спочатку додайте інший, потім відключіть цей." };
  }

  const result = await prisma.account.deleteMany({
    where: { userId: session.user.id, provider },
  });
  if (result.count === 0) {
    return { error: "Цей провайдер не підключено." };
  }

  revalidatePath("/settings");
  return {};
}

// Account Linking, point 9 — "Connected ≠ Public". A no-op if the
// provider isn't actually linked (deleteMany-style updateMany, not
// update — no error for a stale toggle after the account was already
// unlinked in another tab).
export async function setShowOnProfile(provider: string, show: boolean): Promise<AccountLinkingResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Потрібно увійти в акаунт." };
  }

  await prisma.account.updateMany({
    where: { userId: session.user.id, provider },
    data: { showOnProfile: show },
  });

  revalidatePath("/settings");
  revalidatePath(session.user.username ? `/members/${session.user.username}` : "/");
  return {};
}

// Account Linking, section 1/7 — lets someone who signed up via OAuth
// add email+password as a second sign-in method later, so "disconnect my
// only OAuth provider" doesn't have to mean "create a whole separate
// password-only account" — it becomes available on the one they already
// have. Renamed from an earlier password-only version of this action:
// a password with no email attached could never actually be used to sign
// back in (signInWithPassword looks accounts up by email — see
// actions/auth-credentials.ts), so "set a password" always has to also
// mean "and here's the email that goes with it", not two separate steps.
export async function connectEmail(
  _prevState: AccountLinkingResult,
  formData: FormData
): Promise<AccountLinkingResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Потрібно увійти в акаунт." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { error: "Введіть коректний email." };
  }
  if (!isPasswordValid(password)) {
    return { error: `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів.` };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== session.user.id) {
    return { error: "Цей email вже використовується іншим акаунтом." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { email, passwordHash },
  });

  revalidatePath("/settings");
  return {};
}
