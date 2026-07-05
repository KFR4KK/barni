import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Member, Socials } from "@/data/types";

// Every page/component gets Profile data through these functions, never by
// importing `prisma` directly — same convention as lib/members.ts for the
// static data. If claiming/edit rules ever change (e.g. an admin-lock
// flag), only this file needs to change.

export function getProfileBySlug(slug: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { slug } });
}

export function getProfileByUserId(userId: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { userId } });
}

// Bulk-fetches every Profile keyed by slug, for pages (like the home
// index) that render every member at once and would otherwise issue one
// query per row.
export async function getAllProfilesBySlug(): Promise<Map<string, Profile>> {
  const profiles = await prisma.profile.findMany();
  return new Map(profiles.map((profile) => [profile.slug, profile]));
}

function parseSocials(json: Profile["socials"]): Socials {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    return json as Socials;
  }
  return {};
}

// Merges the DB-backed, ownable Profile fields (display name, real name,
// bio, avatar, socials) over the static, design-only Member fields (skills,
// awards, quickInfo, joinedDate, status, ambient palette) that this phase
// deliberately leaves untouched — those aren't part of the Profile model
// and aren't claimable/editable content. This is what "member pages are
// now backed by the Profile model" means without redesigning or
// duplicating every field: static data supplies the parts Profile doesn't
// own, Profile supplies (and can override) the parts it does.
//
// If no Profile row exists yet for a slug — shouldn't happen once seeded,
// but kept defensive since it's a cross-table join at render time — the
// static Member data is the fallback. That's "preserve backwards
// compatibility" in practice: a missing/failed Profile fetch never breaks
// a member page for a signed-out visitor.
export function resolveMemberDisplay(member: Member, profile: Profile | null): Member {
  if (!profile) return member;

  const profileSocials = parseSocials(profile.socials);

  return {
    ...member,
    nickname: profile.displayName || member.nickname,
    realName: profile.realName ?? member.realName,
    bio: profile.bio || member.bio,
    avatar: profile.avatar || member.avatar,
    bannerImage: profile.banner ?? member.bannerImage,
    socials: Object.keys(profileSocials).length > 0 ? profileSocials : member.socials,
  };
}

// The bit of Profile that Member has no field for at all (city/country
// aren't part of the static design data — quickInfo's flag+label pairs are
// hand-curated per member, not structured location data). Pages render
// this alongside the resolved Member rather than folding it in, so it's
// computed once here instead of duplicated at every call site.
export function resolveLocationLabel(profile: Profile | null): string | null {
  if (!profile) return null;
  const parts = [profile.city, profile.country].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}
