import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Phase 9.5 — Profile Auto-Provisioning. Data cleanup, NOT wired into
// `npx prisma db seed`, `migrate`, or any app code path — this only ever
// runs if someone explicitly invokes it (e.g. `npx tsx
// prisma/scripts/cleanup-unclaimed-profiles.ts`). See lib/profiles.ts's
// own comment on createProfileForUser for the full context: the "claim a
// Profile" flow is gone, so a Profile with `userId: null` is no longer a
// reachable, live feature — just a leftover row from prisma/seed.ts's
// pre-Phase-9.5 bootstrap of data/members.ts.
//
// Deliberately conservative:
//   - The WHERE clause never touches a row with a linked User (`userId`
//     not null), so a real member's page can never be deleted by this,
//     no matter which slugs are kept below. Since createProfileForUser
//     always sets `userId` at creation time (see lib/profiles.ts), a
//     `userId: null` row can now ONLY be one of these old seed fixtures
//     — there's no code path left that creates a legitimate unclaimed
//     Profile, so this WHERE clause stays safe to run again in the
//     future if stray null-user rows ever reappear.
//   - KEEP_SLUGS defaults to exactly what this phase's brief asked for
//     ("оставь тільки кефір") — edit this list, not the query below, if
//     the set of slugs to preserve is different on the real database.
//   - This file only *runs* something when explicitly invoked from a
//     terminal; importing it does nothing, so it's safe to have in the
//     tree.
//
// This performs a real, irreversible delete — it is NOT a dry run.
// Back up the database (or run against a staging copy) first if there's
// any doubt about which rows are seed data vs. something real.

const KEEP_SLUGS = ["kefir"];

async function main() {
  const candidates = await prisma.profile.findMany({
    where: { userId: null, slug: { notIn: KEEP_SLUGS } },
    select: { id: true, slug: true, displayName: true },
  });

  if (candidates.length === 0) {
    console.log("No unclaimed, non-kept Profile rows found. Nothing to do.");
    return;
  }

  console.log(`Found ${candidates.length} unclaimed Profile row(s) to delete:`);
  for (const profile of candidates) {
    console.log(`  - ${profile.slug} (${profile.displayName})`);
  }

  const result = await prisma.profile.deleteMany({
    where: { userId: null, slug: { notIn: KEEP_SLUGS } },
  });
  console.log(`Deleted ${result.count} Profile row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
