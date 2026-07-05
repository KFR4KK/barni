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
