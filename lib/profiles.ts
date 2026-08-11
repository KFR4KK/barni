import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Member, Socials } from "@/data/types";

// Every page/component gets Profile data through these functions, never by
// importing `prisma` directly — same convention as lib/members.ts for the
// static data. If claiming/edit rules ever change (e.g. an admin-lock
// flag), only this file needs to change.
//
// Account Linking — Profile.slug is gone (see prisma/schema.prisma's own
// comment on the model). Every /members/[username] URL now resolves
// through User.username, not a separate Profile column, so this file's
// lookups join through User instead of querying Profile directly.
// createProfileForUser also changed shape: it used to both invent a slug
// AND create the Profile row, in the same call, from the createUser
// event; now username selection is its own explicit step (see
// actions/onboarding.ts) that happens *before* this is ever called — a
// User always already has its username set by the time a Profile is
// created, so there's nothing left here to generate or retry on
// collision.

export function getProfileByUserId(userId: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { userId } });
}

// The replacement for the old getProfileBySlug — looks the User up by
// their chosen username first, then returns their Profile (or null if
// they haven't been through onboarding's Profile-creation step for some
// reason). Returns the username alongside the Profile (rather than just
// the Profile) since callers building a Member-shaped object still need
// it — see buildMemberFromProfile below.
export async function getProfileByUsername(
  username: string
): Promise<(Profile & { username: string }) | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { profile: true },
  });
  if (!user?.profile) return null;
  return { ...user.profile, username };
}

interface NewProfileIdentity {
  displayName: string | null;
  avatarUrl: string | null;
}

// Creates the one Profile a User with a chosen username gets — called
// from actions/onboarding.ts right after the username itself is saved
// (see that file), not from an auth event anymore. displayName/avatar
// are seeded from whichever provider the user just signed up with
// (Discord/Google avatar, Telegram name, or left empty for Email
// sign-up); everything else (bio, city, links, etc.) starts empty for
// the user to fill in later via /profile/edit, same as before.
export async function createProfileForUser(
  userId: string,
  identity: NewProfileIdentity
): Promise<Profile> {
  return prisma.profile.create({
    data: {
      displayName: identity.displayName ?? "",
      bio: "",
      avatar: identity.avatarUrl,
      userId,
      claimedAt: new Date(),
    },
  });
}

const FALLBACK_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";

function parseSocials(json: Profile["socials"]): Socials {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    return json as Socials;
  }
  return {};
}

// The Member-shaped fallback for a Profile with no matching row in the
// curated, hand-authored data/members.ts (every real, auto-created
// Profile — that file predates the account system and isn't grown per
// sign-up). Deliberately not a duplicate of resolveMemberDisplay below —
// that function *merges* Profile fields over an existing static Member;
// this one *builds* the equivalent shape from Profile alone, leaving
// every design-only field data/members.ts would otherwise supply
// (skills, quickInfo, status, awards, background) at whatever default
// hides that section, per each field's own comment in data/types.ts —
// never fabricated placeholder content.
export function buildMemberFromProfile(profile: Profile & { username: string }): Member {
  const socials = parseSocials(profile.socials);

  return {
    slug: profile.username,
    nickname: profile.displayName,
    realName: profile.realName ?? undefined,
    bio: profile.bio,
    avatar: profile.avatar || FALLBACK_AVATAR_URL,
    avatarAlt: profile.displayName,
    bannerImage: profile.banner ?? undefined,
    socials: Object.keys(socials).length > 0 ? socials : undefined,
    joinedDate: profile.createdAt.toISOString(),
    status: "active",
  };
}

// Merges the DB-backed, ownable Profile fields (display name, real name,
// bio, avatar, socials) over the static, design-only Member fields (skills,
// awards, quickInfo, joinedDate, status, ambient palette) that this
// deliberately leaves untouched — those aren't part of the Profile model
// and aren't claimable/editable content. Static data supplies the parts
// Profile doesn't own, Profile supplies (and can override) the parts it
// does.
//
// If no Profile row exists yet for a member — shouldn't happen once
// seeded, but kept defensive since it's a cross-table join at render
// time — the static Member data is the fallback. That's "preserve
// backwards compatibility" in practice: a missing/failed Profile fetch
// never breaks a member page for a signed-out visitor.
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
