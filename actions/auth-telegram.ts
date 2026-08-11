"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyTelegramAuth, type TelegramAuthData } from "@/lib/telegram-auth";
import { getActiveSessionUserId } from "@/lib/active-session";
import { createDatabaseSessionForUser } from "@/lib/credentials-session";

const PROVIDER = "telegram";

export interface TelegramAuthResult {
  error?: string;
}

// Telegram isn't a NextAuth provider (see lib/telegram-auth.ts's top
// comment — it's not OAuth2), so none of lib/auth.ts's provider config
// or its signIn callback ever runs for it. This action is the Telegram
// equivalent of that callback + the adapter's own create/link-account
// behavior combined into one place, since here there's no adapter doing
// it automatically. Mirrors the same three cases Discord/Google already
// handle:
//   1. This Telegram account is already linked to a User -> sign into it.
//   2. Not linked to anyone, but the browser already has an active
//      session -> link it to that account (Account Linking, "connect a
//      second method" flow).
//   3. Not linked, no active session -> brand new account, same as any
//      other provider's first sign-in (no username yet — the onboarding
//      gate in app/welcome/page.tsx picks it up from here same as
//      always).
export async function signInWithTelegram(
  _prevState: TelegramAuthResult,
  authData: TelegramAuthData
): Promise<TelegramAuthResult> {
  if (!verifyTelegramAuth(authData)) {
    return { error: "Не вдалося перевірити підпис Telegram. Спробуйте ще раз." };
  }

  const providerAccountId = String(authData.id);

  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: PROVIDER, providerAccountId } },
    select: { userId: true },
  });

  if (existingAccount) {
    // Case 1 — returning sign-in. Same "already signed in as someone
    // else" guard the OAuth signIn callback applies (Account Linking,
    // point 12.11's inverse: here the incoming provider is the one
    // that's taken, not the currently active session).
    const activeUserId = await getActiveSessionUserId();
    if (activeUserId && activeUserId !== existingAccount.userId) {
      return { error: "Цей Telegram вже прив'язаний до іншого акаунта .vibe." };
    }
    await createDatabaseSessionForUser(existingAccount.userId);
    redirect("/welcome");
  }

  const activeUserId = await getActiveSessionUserId();
  const displayName = [authData.first_name, authData.last_name].filter(Boolean).join(" ") || null;

  if (activeUserId) {
    // Case 2 — link to whoever's already signed in.
    await prisma.account.create({
      data: {
        userId: activeUserId,
        type: "oauth",
        provider: PROVIDER,
        providerAccountId,
      },
    });
    redirect("/settings");
  }

  // Case 3 — brand new account. Deliberately no `username` (see
  // lib/username.ts and every other provider's own comment on this) —
  // displayName/avatar are fine to seed from Telegram, same as
  // Discord/Google do for their own equivalents.
  const user = await prisma.user.create({
    data: {
      displayName,
      avatarUrl: authData.photo_url ?? null,
      accounts: {
        create: { type: "oauth", provider: PROVIDER, providerAccountId },
      },
    },
    select: { id: true },
  });

  await createDatabaseSessionForUser(user.id);
  redirect("/welcome");
}
