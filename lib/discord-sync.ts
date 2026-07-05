import { prisma } from "@/lib/db";
import { getGuildMember, DiscordApiError } from "@/lib/discord";

// Phase 4 — the single function that writes serverMember/serverJoinedAt/
// discordRoles onto a Profile. Every trigger point named in the
// requirements (login, visiting /profile, the manual refresh Server
// Action) calls THIS function rather than talking to lib/discord.ts or
// prisma directly — so "how membership gets synced" only ever needs to
// change in one place.
//
// Never trusts anything from the client: the only input is `userId`, and
// the only thing that's ever true of the *result* is what Discord's bot
// API just returned. There's no code path anywhere that lets a client
// request set serverMember/discordRoles directly.

export type DiscordSyncResult =
  | { status: "synced"; serverMember: boolean }
  | { status: "no-discord-account" }
  | { status: "no-profile" }
  | { status: "unavailable"; serverMember: boolean };

export async function syncDiscordMembership(userId: string): Promise<DiscordSyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true },
  });

  // Every User row has a discordId (it's how sign-in works — see
  // lib/auth.ts), so this only happens if `userId` doesn't correspond to
  // a real user at all. Defensive, not expected in practice.
  if (!user?.discordId) {
    return { status: "no-discord-account" };
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { serverMember: true },
  });

  // Nothing to write into: this User hasn't claimed a Profile yet (see
  // prisma/schema.prisma's comment on unclaimed profiles). There's no
  // row to store membership state on, so this is a no-op, not an error.
  if (!profile) {
    return { status: "no-profile" };
  }

  try {
    const membership = await getGuildMember(user.discordId);

    await prisma.profile.update({
      where: { userId },
      data: {
        serverMember: membership.isMember,
        serverJoinedAt: membership.joinedAt,
        discordRoles: membership.roleIds,
        discordSyncedAt: new Date(),
      },
    });

    return { status: "synced", serverMember: membership.isMember };
  } catch (error) {
    // Discord unreachable, rate-limited, misconfigured bot token, etc.
    // Per the requirement "keep the last known membership state instead
    // of deleting data": deliberately do NOT touch the Profile row here.
    // Whatever was written by the last successful sync stays as-is.
    if (error instanceof DiscordApiError) {
      console.error("[discord-sync] Discord API unavailable, keeping last known state:", error.message);
      return { status: "unavailable", serverMember: profile.serverMember };
    }
    throw error;
  }
}
