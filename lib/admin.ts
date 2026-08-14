// Updates page (Dev Blog / Changelog) — the one place today that needs
// to distinguish "the admin" from everyone else. Deliberately NOT a new
// roles table: prisma/schema.prisma's own comment on User already
// earmarks `roles UserRole[]` as a stub for a future real permissions
// system, and building that out now for a single "is this the site
// owner" check would be exactly the kind of premature system this
// codebase's own conventions warn against ("не переписывай существующую
// систему без необходимости"). A comma-separated env var is the whole
// implementation; swapping this for a real roles table later only means
// changing what's inside this one function, not any of its callers.
const ADMIN_USERNAMES = new Set(
  (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((username) => username.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return ADMIN_USERNAMES.has(username.toLowerCase());
}
