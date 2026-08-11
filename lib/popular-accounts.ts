import { prisma } from "@/lib/db";
import type { PopularAccount } from "@/components/feed/PopularAccountsCard";

// How many rows the "Популярні акаунти" card always shows. Real accounts
// fill in from the top (most followers first); if the DB doesn't have
// this many users yet, the rest are filled with non-clickable
// placeholder rows so the card never looks sparse during early testing.
export const POPULAR_ACCOUNTS_LIMIT = 4;

// Every User row is a distinct account (id is the primary key), so a
// single findMany() can never return the same account twice — no extra
// de-duplication needed here.
export async function getPopularAccounts(
  limit: number = POPULAR_ACCOUNTS_LIMIT
): Promise<PopularAccount[]> {
  const users = await prisma.user.findMany({
    take: limit,
    // Most followers first; ties (including the common "0 followers"
    // case while the server is new) go to whoever signed up more
    // recently, so newer members surface first.
    orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
    include: {
      profile: { select: { displayName: true, avatar: true } },
      _count: { select: { followers: true } },
    },
  });

  const accounts: PopularAccount[] = users.map((user) => ({
    displayName: user.profile?.displayName || user.displayName || user.username || user.id,
    username: user.username ?? user.id,
    avatarUrl: user.profile?.avatar || user.avatarUrl,
    followers: user._count.followers,
    profileUsername: user.profile ? user.username : null,
  }));

  if (accounts.length >= limit) {
    return accounts;
  }

  // Testing-phase fallback: not enough real users yet to fill the card,
  // so pad it out with inert placeholder rows (no link, 0 followers).
  // These are never persisted anywhere — as soon as real accounts exist,
  // this branch simply stops running.
  const placeholders: PopularAccount[] = Array.from(
    { length: limit - accounts.length },
    (_, i) => ({
      displayName: "User",
      username: `username${i + 1}`,
      avatarUrl: null,
      followers: 0,
      profileUsername: null,
    })
  );

  return [...accounts, ...placeholders];
}
