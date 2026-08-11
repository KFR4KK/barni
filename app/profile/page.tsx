import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfileByUserId, createProfileForUser } from "@/lib/profiles";

// Phase 9.5 — Profile Auto-Provisioning. Replaces the old "Ваш профіль
// заявлено" page entirely — there's no "claimed vs unclaimed" state left
// to display once every signed-in User is guaranteed a Profile (see
// actions/onboarding.ts, which creates it right after username choice).
// /profile is kept only as a stable URL — components/auth/UserMenu.tsx's
// "Профіль" link still points here — whose only job now is "find my
// profile, then send me to it".
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Account Linking — the onboarding gate (app/welcome/page.tsx) never
  // lets an authenticated user reach this page without a username, so
  // this is the same defensive-only fallback the old version had, just
  // pointed at /onboarding/username instead of silently fabricating one.
  if (!session.user.username) {
    redirect("/onboarding/username");
  }

  let profile = await getProfileByUserId(session.user.id);

  // Defensive only — should never happen once onboarding's
  // createProfileForUser call has run, but per this page's original
  // brief: a signed-in User somehow without a Profile shouldn't be a
  // dead end.
  if (!profile) {
    profile = await createProfileForUser(session.user.id, {
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
    });
  }

  redirect(`/members/${session.user.username}`);
}
