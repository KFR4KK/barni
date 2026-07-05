import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getDiscordAvatarUrl } from "@/lib/discord";

// This file is the ONLY place that configures how sign-in works. Nothing
// else in the app should import next-auth directly — pages, components and
// Server Actions go through `auth()`, `signIn()`, `signOut()` exported here.
//
// Session strategy: "database", not the default JWT strategy. A database
// session can be revoked instantly (delete the row) — required for the
// admin "ban user" action planned in a later phase. JWT sessions stay
// valid until they expire, which isn't good enough for that. See the
// architecture blueprint, Section 4, for the full reasoning.

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },

  // Route auth errors (cancelled login, invalid callback, Discord API
  // failures, etc.) to our own styled page instead of Auth.js's default
  // unstyled error screen.
  pages: {
    error: "/auth/error",
  },

  providers: [
    // No clientId/clientSecret passed explicitly: Auth.js v5 auto-reads
    // them from AUTH_DISCORD_ID / AUTH_DISCORD_SECRET by naming
    // convention (AUTH_<PROVIDER_ID_UPPERCASE>_ID/_SECRET). See
    // .env.local.example and docs/AUTH_SETUP.md.
    Discord({
      // "identify" is the minimum scope needed for id/username/avatar.
      // Deliberately not requesting "email" — nothing in this phase (or
      // the planned schema) needs it, and requesting scopes you don't use
      // is an unnecessary trust ask of the user.
      authorization: { params: { scope: "identify" } },

      // Overrides next-auth's default Discord -> User field mapping.
      // Whatever shape this returns is what the Prisma adapter inserts
      // into the User table on first sign-in — see prisma/schema.prisma.
      profile(discordProfile) {
        return {
          // Required by the OAuth profile type, but not what ends up as
          // the row's primary key: the adapter lets Prisma assign the
          // real `id` (see the User model's @default(cuid())). The
          // Discord snowflake is what we actually key off of, stored
          // separately as `discordId`.
          id: discordProfile.id,
          discordId: discordProfile.id,
          username: discordProfile.username,
          displayName: discordProfile.global_name ?? discordProfile.username,
          avatarUrl: getDiscordAvatarUrl(discordProfile.id, discordProfile.avatar),
        };
      },
    }),
  ],

  callbacks: {
    // With the database strategy, this callback receives the full User
    // row (not a JWT payload) — copy the fields the rest of the app needs
    // onto `session.user` so pages/components never have to query the DB
    // themselves just to show a name or avatar.
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.discordId = user.discordId;
      session.user.username = user.username;
      session.user.displayName = user.displayName;
      session.user.avatarUrl = user.avatarUrl;
      return session;
    },
  },

  events: {
    // Runs on every successful sign-in (new and returning users alike).
    // Deliberately only touches `lastLoginAt` here — username/avatar are
    // set once at creation via `profile()` above and are left alone after
    // that, so a future profile-editing feature (or a manually uploaded
    // avatar) is never silently overwritten by the next Discord login.
    async signIn({ user }) {
      if (!user?.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    },
  },
});
