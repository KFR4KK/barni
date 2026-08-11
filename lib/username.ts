// The one place that defines what a valid BARNI username looks like.
// Used by actions/onboarding.ts (first choice) and the client-side forms
// that collect it — so the rule can never drift between "what the server
// enforces" and "what the form's helper text claims".

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// A short reserved list — route segments this app itself uses, or names
// that would just be confusing (e.g. a user named "admin"). Not
// exhaustive by design; the DB's @unique constraint on User.username is
// the actual source of truth for "is this taken", this is only for "is
// this obviously a bad idea".
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "api",
  "settings",
  "login",
  "register",
  "sign-in",
  "sign-up",
  "onboarding",
  "welcome",
  "feed",
  "projects",
  "posts",
  "members",
  "profile",
  "auth",
  "discord",
  "telegram",
  "google",
  "vibe",
  "barni",
]);

export interface UsernameValidationResult {
  valid: boolean;
  reason?: string;
}

// Normalizes to the exact shape USERNAME_PATTERN checks — lowercase,
// trimmed. Callers store/compare the normalized form, never the raw user
// input, so "Max" and "max" can never end up as two different rows
// racing for the same public identity.
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): UsernameValidationResult {
  const username = normalizeUsername(raw);

  if (username.length < 3 || username.length > 20) {
    return { valid: false, reason: "Від 3 до 20 символів." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, reason: "Лише латинські літери, цифри та _" };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, reason: "Цей username зарезервовано." };
  }

  return { valid: true };
}
