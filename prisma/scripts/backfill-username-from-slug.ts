import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Account Linking — RUN THIS BEFORE `npx prisma migrate dev` ON ANY
// DATABASE THAT ALREADY HAS REAL USERS.
//
// Why this has to happen first, and in this order:
//   1. Today, `Profile.slug` is what /members/[slug] actually resolves
//      through — it's unique and reliable. `User.username` also exists,
//      but is NOT unique at the DB level today and is just a copy of
//      whatever the person's Discord handle was at sign-up.
//   2. The new schema (see prisma/schema.prisma) removes Profile.slug
//      entirely and makes User.username the one canonical, UNIQUE
//      identifier — every /members/[username] URL depends on it.
//   3. If the migration just ran directly: Profile.slug's data is gone
//      the moment that column is dropped, and adding `@unique` to
//      User.username will FAIL outright if any two existing users
//      happen to already share a username (very possible — nothing
//      enforced that today).
//
// This script closes that gap safely: for every claimed Profile (one
// with a real linked User), it copies that Profile's slug onto
// User.username — overwriting whatever username the app already had for
// that user, since the slug is the value that's actually been live and
// working as their public URL, and definitely unique. Run this, confirm
// it printed no unresolved conflicts, THEN run the schema migration.
//
// Usage:
//   npx tsx prisma/scripts/backfill-username-from-slug.ts          (dry run — prints what it would do)
//   npx tsx prisma/scripts/backfill-username-from-slug.ts --apply  (writes the changes)
//
// Safe to re-run: an already-matching username is skipped, not
// re-written, so running this twice (e.g. once to review, once to
// apply) never touches a row twice.
async function main() {
  const apply = process.argv.includes("--apply");

  // Raw query, not `prisma.profile.findMany` — by the time this script
  // is actually needed, schema.prisma may already have been edited to
  // the NEW shape (Profile.slug gone) in the working tree, which would
  // make the generated Prisma Client reject `slug` as an unknown field.
  // $queryRaw reads the column directly regardless of what the Prisma
  // Client was generated against, which is exactly what a one-off
  // pre-migration data script needs.
  const rows = await prisma.$queryRaw<
    { slug: string; userId: string; currentUsername: string | null }[]
  >`
    SELECT p.slug AS slug, p."userId" AS "userId", u.username AS "currentUsername"
    FROM "Profile" p
    JOIN "User" u ON u.id = p."userId"
    WHERE p."userId" IS NOT NULL
  `;

  if (rows.length === 0) {
    console.log("No claimed Profile rows found. Nothing to backfill.");
    return;
  }

  // Detect collisions BEFORE writing anything: two different users
  // somehow ending up with the same slug shouldn't be possible (slug was
  // @unique), but this is exactly the kind of check a one-off migration
  // script should never skip just because "it shouldn't happen".
  const slugToUsers = new Map<string, string[]>();
  for (const row of rows) {
    slugToUsers.set(row.slug, [...(slugToUsers.get(row.slug) ?? []), row.userId]);
  }
  const collisions = [...slugToUsers.entries()].filter(([, userIds]) => userIds.length > 1);
  if (collisions.length > 0) {
    console.error("Found slug collisions across users — resolve these manually before continuing:");
    for (const [slug, userIds] of collisions) {
      console.error(`  - "${slug}": users ${userIds.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  let changed = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.currentUsername === row.slug) {
      skipped += 1;
      continue;
    }

    console.log(
      `${apply ? "Setting" : "Would set"} user ${row.userId} username: ${row.currentUsername ?? "(null)"} -> ${row.slug}`
    );
    if (apply) {
      await prisma.$executeRaw`UPDATE "User" SET username = ${row.slug} WHERE id = ${row.userId}`;
    }
    changed += 1;
  }

  console.log(
    `${apply ? "Updated" : "Would update"} ${changed} user(s); ${skipped} already matched their slug.`
  );
  if (!apply) {
    console.log("Dry run only — re-run with --apply to write these changes.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
