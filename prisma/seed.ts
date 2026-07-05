import { PrismaClient } from "@prisma/client";
import { members } from "../data/members";

const prisma = new PrismaClient();

// Phase 3, requirement 3: every member who already has a masthead page
// gets a matching, unclaimed Profile row to attach to. This is a one-time
// bootstrap from the static `data/members.ts` file — once a member claims
// their profile and edits it, the Profile row (not data/members.ts) is the
// source of truth for their displayName/realName/bio/avatar/socials. See
// lib/profiles.ts.
//
// Run with: npx prisma db seed
// (also runs automatically after `npx prisma migrate dev`)
async function main() {
  for (const member of members) {
    await prisma.profile.upsert({
      where: { slug: member.slug },
      create: {
        slug: member.slug,
        displayName: member.nickname,
        realName: member.realName || null,
        bio: member.bio,
        avatar: member.avatar,
        socials: member.socials ?? {},
      },
      // Deliberately empty: re-running the seed must never overwrite a
      // profile that's already been claimed and edited. This only fills
      // in profiles that don't exist yet (e.g. a newly added member in
      // data/members.ts).
      update: {},
    });
  }

  console.log(`Seeded ${members.length} unclaimed profile(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
