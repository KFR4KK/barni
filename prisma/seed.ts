import { PrismaClient } from "@prisma/client";
import { BUILT_IN_TAGS } from "../lib/tags";
import { slugify } from "../lib/utils";

const prisma = new PrismaClient();

// Account Linking — this used to also upsert an unclaimed, `userId: null`
// Profile row per curated data/members.ts entry (Phase 3's original
// bootstrap, already unused as a live feature since Phase 9.5 — see this
// file's git history / prisma/scripts/cleanup-unclaimed-profiles.ts,
// removed alongside this). Those rows were keyed by Profile.slug, which
// no longer exists (see prisma/schema.prisma's comment on Profile) —
// /members/[username] resolves through User.username now, and an
// unattached Profile has no username to resolve through. Seeding rows
// that can never be reached by any URL isn't worth keeping around just
// because it used to work; data/members.ts's curated pages still render
// entirely from that static file regardless (see lib/members.ts), with
// or without a matching DB row.
//
// Run with: npx prisma db seed
// (also runs automatically after `npx prisma migrate dev`)
async function main() {
  // Phase 10 — Tags. Upserts the built-in catalog (lib/tags.ts's
  // BUILT_IN_TAGS) by slug. `update: { name }` so renaming an entry in
  // BUILT_IN_TAGS and re-seeding actually renames the row instead of
  // being a no-op — safe
  // to do because, unlike a Profile, nothing about a built-in tag is
  // ever user-edited, so there's no risk of clobbering someone's own
  // changes. Adding a brand-new entry to BUILT_IN_TAGS and re-running
  // this script is the entire "add a new built-in tag" workflow — see
  // that constant's own comment.
  for (const name of BUILT_IN_TAGS) {
    const slug = slugify(name);
    await prisma.tag.upsert({
      where: { slug },
      create: { slug, name, isBuiltIn: true },
      update: { name, isBuiltIn: true },
    });
  }

  console.log(`Seeded ${BUILT_IN_TAGS.length} built-in tag(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
