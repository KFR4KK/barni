import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { getDiscordAvatarUrl } from "@/lib/discord";
import { syncDiscordMembership } from "@/lib/discord-sync";
import { getActiveSessionUserId } from "@/lib/active-session";

// This file is the ONLY place that configures how sign-in works for
// every OAuth provider (Discord today; Google/Telegram slot in here the
// same way later). Nothing else in the app should import next-auth
// directly — pages, components and Server Actions go through `auth()`,
// `signIn()`, `signOut()` exported here.
//
// Account Linking — email + password sign-in is deliberately NOT a
// NextAuth "Credentials" provider. Auth.js's Credentials provider only
// works with the JWT session strategy — the database strategy (below)
// silently fails to persist a session for it (this is a known,
// long-standing Auth.js limitation, not a bug in this app — see
// actions/auth-credentials.ts's own comment for links/detail). Rather
// than switch the *entire app* to JWT sessions and lose "delete the row
// to instantly revoke a session" (the whole reason database sessions
// were chosen — see below), email+password is its own Server Action
// that calls this same adapter's `createSession` directly. It produces
// the exact same kind of Session row and cookie a Discord/Google/
// Telegram sign-in does — `auth()` below can't tell the difference
// afterwards, because there isn't one.
//
// Session strategy: "database", not the default JWT strategy. A database
// session can be revoked instantly (delete the row) — required for the
// admin "ban user" action planned in a later phase. JWT sessions stay
// valid until they expire, which isn't good enough for that. See the
// architecture blueprint, Section 4, for the full reasoning.

const adapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
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
    // .env.local.example and docs/AUTH_SETUP.md. Google/Telegram will
    // follow the same shape once added.
    Discord({
      // "identify" is the minimum scope needed for id/username/avatar.
      // Deliberately not requesting "email" — nothing today needs it,
      // and requesting scopes you don't use is an unnecessary trust ask.
      authorization: { params: { scope: "identify" } },

      // Overrides next-auth's default Discord -> User field mapping.
      // Whatever shape this returns is what the Prisma adapter inserts
      // into the User table on first sign-in — see prisma/schema.prisma.
      //
      // Account Linking — deliberately does NOT set `username` anymore.
      // The BARNI username is chosen by the person at
      // /onboarding/username (see that page + actions/onboarding.ts),
      // never imported from Discord (or Google/Telegram) — see
      // lib/username.ts and the brief's point 13. A brand-new Discord
      // sign-in creates a User with `username: null`; app/welcome/page.tsx
      // is the gate that sends them to onboarding before anything else.
      profile(discordProfile) {
        return {
          // Required by the OAuth profile type, but not what ends up as
          // the row's primary key: the adapter lets Prisma assign the
          // real `id` (see the User model's @default(cuid())). The
          // Discord snowflake is what we actually key off of, stored
          // separately as `discordId`.
          id: discordProfile.id,
          discordId: discordProfile.id,
          displayName: discordProfile.global_name ?? discordProfile.username,
          avatarUrl: getDiscordAvatarUrl(discordProfile.id, discordProfile.avatar),
        };
      },
    }),

    // Same shape as Discord above — no clientId/clientSecret passed
    // explicitly, Auth.js v5 auto-reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
    // Unlike Discord, Google has no dedicated `googleId` column on User:
    // there's no Google-specific feature (like Discord's membership
    // sync) that needs one, so linking is entirely through the generic
    // Account row (provider: "google", providerAccountId: the Google
    // account's `sub`) — exactly the "add a provider without touching
    // User at all" shape prisma/schema.prisma's comment on Account
    // describes.
    Google({
      // Deliberately does NOT set `username` (same reasoning as
      // Discord's profile() above — see lib/username.ts) — and
      // deliberately does NOT set `email` either, even though Google
      // verifies it and the default mapping would: if that email
      // already belongs to a different existing User (e.g. someone
      // registered with Email+password first, then tries Google fresh,
      // signed out), inserting a second User row with the same email
      // would hit `email`'s unique constraint and crash the sign-in
      // with a raw error instead of the clean "you already have an
      // account, sign in first, then link this" flow. Leaving Google
      // sign-up exactly like Discord — display name + avatar only —
      // sidesteps that entirely; the person can still add their email
      // afterward via Settings, which already checks for that
      // collision gracefully (see actions/account-linking.ts's
      // connectEmail).
      profile(googleProfile) {
        return {
          id: googleProfile.sub,
          discordId: null,
          displayName: googleProfile.name ?? null,
          avatarUrl: googleProfile.picture ?? null,
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

    // Account Linking, points 5/6/12.11. `user` here is whoever the
    // adapter has already resolved this OAuth account to — either a
    // brand-new user about to be created, or (if `provider` +
    // `providerAccountId` already matches an Account row) the existing
    // user that account belongs to. Neither of those two cases needs
    // anything special from this callback: "brand new" is a normal
    // sign-up, "already linked, no one else is signed in right now" is
    // a normal returning-user login, both handled by the adapter.
    //
    // The one case this callback exists for: someone is ALREADY signed
    // in (see lib/active-session.ts — reads the request's own cookie,
    // since this callback isn't handed the pre-existing session) and
    // just triggered a second provider's OAuth flow from Settings to
    // link it. If that provider account already belongs to a DIFFERENT
    // user than the one currently signed in, this refuses rather than
    // silently switching the browser to the other account or letting
    // Prisma's own `@@unique([provider, providerAccountId])` throw a
    // raw constraint error. If it isn't linked to anyone yet, returning
    // `true` here lets the adapter's default "already signed in +
    // signIn(newProvider)" behavior link it to the current session's
    // user (an Auth.js/NextAuth built-in, not something this callback
    // has to implement itself) — the actual write happens after this
    // callback approves it, not inside it.
    async signIn({ user, account }) {
      if (!account || account.type !== "oauth") return true;

      const activeUserId = await getActiveSessionUserId();
      if (activeUserId && user.id && activeUserId !== user.id) {
        return false;
      }

      return true;
    },
  },

  events: {
    // Runs on every successful sign-in (new and returning users alike),
    // for every OAuth provider configured above. Deliberately only
    // touches `lastLoginAt` here — displayName/avatar are set once at
    // creation via each provider's `profile()` mapping and left alone
    // after that, so a future profile edit (or a manually uploaded
    // avatar) is never silently overwritten by the next OAuth login.
    //
    // Does NOT auto-create a Profile anymore (that used to happen here,
    // keyed off the auto-imported Discord username) — Profile creation
    // now happens in actions/onboarding.ts, right after username choice,
    // for every provider uniformly including Discord.
    async signIn({ user }) {
      if (!user?.id) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Phase 4 — "synchronize on login" requirement. This does not
      // change how sign-in works or what it grants: it's a side effect
      // that runs after the session is already established, writing
      // only to Profile.serverMember/serverJoinedAt/discordRoles (see
      // lib/discord-sync.ts). Wrapped so that a Discord outage, or a
      // brand-new user with no Profile yet (see syncDiscordMembership's
      // "no-profile" case — true for every new sign-up now, not just
      // Discord ones, until onboarding finishes), can never fail — or
      // even delay — login itself.
      try {
        await syncDiscordMembership(user.id);
      } catch (error) {
        console.error("[auth] Discord membership sync failed on login:", error);
      }
    },
  },
});

// Exposed so actions/auth-credentials.ts (email+password) and, later,
// any other non-OAuth sign-in path can create a real database Session
// row through the exact same adapter NextAuth itself uses above — see
// this file's own top comment for why that's the correct fix instead of
// a NextAuth Credentials provider.
export const authAdapter = adapter;
