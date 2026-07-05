"use server";

import { signIn, signOut } from "@/lib/auth";

// Thin Server Action wrappers around Auth.js's signIn/signOut. Kept in
// their own file (rather than calling signIn/signOut inline inside
// components) so both server components (SignInButton) and client
// components (UserMenu's logout button) can import the same reference —
// a plain arrow function defined inside a client component can't be
// passed as a Server Action.

export async function signInWithDiscord() {
  await signIn("discord");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
