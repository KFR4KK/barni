// Small, provider-specific helpers, kept separate from lib/auth.ts on
// purpose: future features that also need to talk to Discord's CDN/API
// (Discord Presence, richer profile sync, etc.) have one obvious place to
// add to, instead of growing inside the auth config file.

/**
 * Builds a Discord CDN avatar URL from a user's Discord ID + avatar hash.
 * Falls back to Discord's own default embedded avatar when the user has
 * no avatar set, so callers never have to handle a missing image case.
 */
export function getDiscordAvatarUrl(discordId: string, avatarHash: string | null | undefined): string {
  if (!avatarHash) {
    // Discord assigns one of 6 default avatars based on the account id.
    const defaultIndex = Number((BigInt(discordId) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }

  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}`;
}

// ---------------------------------------------------------------------------
// Phase 4 — Discord Bot API service
//
// This is the ONLY module in the app allowed to call Discord's REST API
// with the bot token. Everything that needs to know "is this Discord user
// in our server" — the login hook, the profile page, the manual-refresh
// Server Action — goes through `getGuildMember()` below rather than
// building its own `fetch` call. One place to change if the API version,
// auth scheme, or error handling ever needs to change.
//
// This deliberately does NOT touch the OAuth-based user-facing calls
// lib/auth.ts makes (those authenticate *as the user*, via Discord's
// OAuth token, and only ever return that user's own basic profile). This
// section authenticates *as the bot* (`Authorization: Bot <token>`) and
// asks Discord for server-membership state that the user's own OAuth
// token was never scoped to see. Two different credentials, two
// different trust levels — kept in the same file only because both are
// "talk to Discord", not because they're the same kind of call.

const DISCORD_API_BASE = "https://discord.com/api/v10";

export interface DiscordGuildMembership {
  /** True: Discord confirmed this user is currently a member of the guild. */
  isMember: boolean;
  /** When they joined the guild, per Discord — null if not a member. */
  joinedAt: Date | null;
  /** Discord role IDs the member currently holds. Empty if not a member. */
  roleIds: string[];
}

// Thrown for anything that means "we don't actually know the answer"
// (network failure, Discord 5xx, bad bot credentials, rate limiting) —
// as opposed to a confident 404, which means "we asked and they're not a
// member." Callers (lib/discord-sync.ts) rely on this distinction to
// decide whether to update stored membership state or leave it alone.
export class DiscordApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "DiscordApiError";
  }
}

function getBotCredentials(): { token: string; guildId: string } {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) {
    throw new DiscordApiError(
      "DISCORD_BOT_TOKEN and DISCORD_GUILD_ID must both be set to sync server membership."
    );
  }
  return { token, guildId };
}

// Looks up a single Discord user's membership in the configured guild via
// the bot API: GET /guilds/{guild.id}/members/{user.id}. Requires the bot
// to already be a member of that guild (see docs/DISCORD_SETUP.md) and,
// for `roles` to be meaningful beyond an ID list, the "Server Members
// Intent" enabled in the Discord Developer Portal — the endpoint itself
// works either way since this is a direct REST lookup, not the gateway.
//
// Returns `{ isMember: false, ... }` on a confident 404 (Discord knows
// the guild, the user just isn't in it). Throws `DiscordApiError` for
// every other failure mode, so a Discord outage is never confused with
// "this person left the server" — see lib/discord-sync.ts for how that
// distinction is used.
export async function getGuildMember(discordId: string): Promise<DiscordGuildMembership> {
  const { token, guildId } = getBotCredentials();

  let response: Response;
  try {
    response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${token}` },
      // Never cache a membership check — this is exactly the kind of
      // state that must always reflect a fresh server call.
      cache: "no-store",
    });
  } catch (error) {
    throw new DiscordApiError(
      `Network error contacting Discord: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (response.status === 404) {
    return { isMember: false, joinedAt: null, roleIds: [] };
  }

  if (!response.ok) {
    throw new DiscordApiError(`Discord API returned ${response.status}`, response.status);
  }

  const data = (await response.json()) as { joined_at?: string; roles?: string[] };
  return {
    isMember: true,
    joinedAt: data.joined_at ? new Date(data.joined_at) : null,
    roleIds: Array.isArray(data.roles) ? data.roles : [],
  };
}

// The invite link shown by the "Join Discord" UI when a member isn't in
// the server yet. Read here (not inline in a component) so there's one
// place to fall back from if the env var is ever unset.
export function getDiscordInviteUrl(): string | null {
  return process.env.DISCORD_INVITE ?? null;
}
