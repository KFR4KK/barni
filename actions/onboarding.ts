"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateUsername, normalizeUsername } from "@/lib/username";
import { createProfileForUser } from "@/lib/profiles";

export interface ChooseUsernameResult {
  error?: string;
}

// The one place a User.username is ever set for the first time — see
// lib/username.ts for the validation rule, and app/welcome/page.tsx for
// the gate that sends anyone without one here before they reach the rest
// of the app. Works identically regardless of which provider (or email)
// the person just signed up with; none of them ever prefill this field.
export async function chooseUsername(
  _prevState: ChooseUsernameResult,
  formData: FormData
): Promise<ChooseUsernameResult> {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Already has one — nothing to do, just move on. Covers a double
  // submit and someone navigating back to this page after finishing
  // onboarding in another tab.
  if (session.user.username) {
    redirect("/welcome");
  }

  const raw = String(formData.get("username") ?? "");
  const { valid, reason } = validateUsername(raw);
  if (!valid) {
    return { error: reason };
  }
  const username = normalizeUsername(raw);

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { username },
    });
  } catch (error) {
    // P2002 = unique constraint violation — this exact username was
    // taken between the page rendering and this submit. Retrying on the
    // DB's own constraint (rather than a pre-check) is the same
    // read-then-write-gap-free pattern lib/profiles.ts's old slug
    // allocation used to follow — just surfaced to the person instead of
    // auto-retried, since a username is a deliberate choice, not
    // something to silently suffix with "-2".
    const isUniqueConflict =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";
    if (isUniqueConflict) {
      return { error: "Цей username вже зайнято." };
    }
    throw error;
  }

  // Seed the new Profile from whatever this provider already gave us
  // (Discord/Google avatar + display name; both null for Email sign-up,
  // which is fine — /profile/edit fills them in later).
  await createProfileForUser(session.user.id, {
    displayName: session.user.displayName,
    avatarUrl: session.user.avatarUrl,
  });

  redirect("/welcome");
}
