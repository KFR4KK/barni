"use server";

import { signIn, signOut } from "@/lib/auth";

// Thin Server Action wrappers around Auth.js's signIn/signOut. Kept in
// their own file (rather than calling signIn/signOut inline inside
// components) so both server components (SignInButton) and client
// components (UserMenu's logout button) can import the same reference —
// a plain arrow function defined inside a client component can't be
// passed as a Server Action.

// Phase 9.5 — Profile Auto-Provisioning & Welcome Page. Every sign-in —
// new or returning — now lands on /welcome first, not back on whatever
// page the button was clicked from. That page is the one place that
// decides, per user, whether this is worth showing (see its own comment
// and User.hasSeenWelcome): a returning user bounces straight through to
// /feed, so this fixed destination costs them nothing extra in practice.
export async function signInWithDiscord() {
  await signIn("discord", { redirectTo: "/welcome" });
}

// Same as signInWithDiscord, for Google.
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/welcome" });
}

// Account Linking, section 7 — the "Connect" button on /settings for
// someone already signed in linking Discord as an additional method.
// Same signIn("discord") call as above; only the redirect target
// differs, so this doesn't land back on the onboarding/welcome path a
// brand-new sign-up goes through.
export async function connectDiscordFromSettings() {
  await signIn("discord", { redirectTo: "/settings" });
}

// Same idea as connectDiscordFromSettings, for Google.
export async function connectGoogleFromSettings() {
  await signIn("google", { redirectTo: "/settings" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
