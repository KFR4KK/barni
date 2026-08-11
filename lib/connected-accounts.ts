import { prisma } from "@/lib/db";

// Account Linking, point 9 — the read side of Account.showOnProfile.
// Deliberately its own tiny module rather than folded into lib/follows.ts
// or lib/profiles.ts: this is the one query that's allowed to read
// Account rows for public display, so it's easy to audit that nothing
// else leaks a provider that wasn't explicitly marked public.
export async function getPubliclyShownProviders(userId: string): Promise<string[]> {
  const accounts = await prisma.account.findMany({
    where: { userId, showOnProfile: true },
    select: { provider: true },
  });
  return accounts.map((account) => account.provider);
}
