# The Collective — foundation build

This is the production-ready foundation described in the architecture document: fully
functional routing, layout, member system, and design tokens — with final visual polish
and Framer Motion animation deliberately left for the next stage.

## Setup

This sandbox has no network access, so `npm install` couldn't be run or verified here.
On your machine:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Before it looks right: add real avatar images

`data/members.ts` references four sample members with avatar paths like
`/images/members/ava-cole.jpg`, but no image files exist yet — `public/images/members/`
is currently empty. `next/image` will error on missing files. Add a `.jpg`/`.png` per
member at that path (matching the `avatar` field) before running the dev server, or
temporarily point `avatar` at any placeholder image URL.

## What's implemented

- Full routing: `/`, `/members/[slug]`, root 404, and a member-specific 404 — all
  statically generated (`generateStaticParams`) since Next.js 15 requires `params` to be
  awaited.
- The complete data layer: `data/types.ts`, `data/members.ts` (the single file to edit
  when adding a member), and `lib/members.ts` as the only access point to it.
- Every component from the architecture document, using the masthead-index naming
  (`MemberIndex` / `MemberRow`) rather than the earlier `MemberGrid` / `MemberCard`
  naming — that's the approved design direction (a credits-style list, not a card grid),
  not a deviation introduced at this stage.
- Design tokens (color, type, radius, one shadow, one blur) wired through
  `tailwind.config.ts` and `app/globals.css`, exactly as specified in the design system
  document — deliberately minimal (one of each, not a multi-step scale).
- Every component is a Server Component except `components/ui/Button.tsx`, which is
  marked `"use client"` because it optionally accepts an `onClick` handler. It's the one
  interactive-by-necessity exception; nothing else needed a client boundary. All hover
  behavior on the masthead rows and social links is done with Tailwind's `group-hover`,
  not JavaScript.
- Accessibility floor: semantic heading order, visible focus rings using the brass
  token, required `alt` text on every avatar (enforced by the `Member` type, not just a
  convention), and a `prefers-reduced-motion` fallback in `globals.css`.
- Responsive layout: single-column stacking on mobile/tablet for the profile page and
  hero, masthead rows collapse the portrait preview and role label below `md`.

## What's intentionally deferred to the next (polish) stage

- `lib/motion.ts` only exports shared `duration`/`easing` constants — the actual Framer
  Motion variants (page cross-fade, scroll reveals, stagger) aren't built yet.
- The grain texture (`components/effects/NoiseOverlay.tsx`) is implemented as an inline
  SVG turbulence filter so the foundation doesn't depend on a designed asset that
  doesn't exist yet. It can be swapped for a real grain PNG later without touching
  anything else.
- No mouse-parallax on the hero, no page-transition cross-fade, no staggered headline
  entrance yet — the pages render correctly and completely without them.

## One naming note vs. the original component list

`ProfileHeader`/`ProfileContent`/`MemberGrid`/`MemberCard` from the earlier stage's
example list were superseded during architecture planning by `MemberHeader`,
`ProfileLayout`, `MemberIndex`, and `MemberRow` — reflecting the masthead-list direction
that was approved over a card-grid layout. This build follows that later decision, not
the example names, per "don't redesign, follow the architecture document."

## Phase 3 — Profile ownership & editing

Member pages are now backed by a `Profile` row in the database instead of purely static
ownership. `data/members.ts` still supplies the design-only content this phase doesn't
touch (skills, awards, quickInfo, joined date, status, ambient palette); the new
`Profile` model supplies — and can override — the ownable, editable content (display
name, real name, bio, avatar, banner, city, country, social links).

### What's new

- **`Profile` model** (`prisma/schema.prisma`): `slug` (unique, matches the static
  member's `slug`), `displayName`, `realName`, `bio`, `avatar`, `banner`, `city`,
  `country`, `socials` (JSON), `createdAt`, `updatedAt`, `claimedAt` (nullable), and
  `userId` (nullable + unique). Nullable + unique `userId` is what encodes "may belong
  to exactly one User" and "one User can own only one Profile" — enforced at the
  database level, not just in application code.
- **Migration**: `prisma/migrations/20260705234500_add_profile/`. Run
  `npx prisma migrate dev` to apply it (this also regenerates the Prisma Client with the
  new `Profile` type — this sandbox has no network access, so that regeneration
  couldn't be run or verified here).
- **Seeding**: `prisma/seed.ts` creates one unclaimed `Profile` (`userId: null`) per
  existing entry in `data/members.ts`, so every current member has something to claim
  right away. Run `npx prisma db seed` (also runs automatically after `migrate dev`).
  Re-running it never overwrites a profile that's already been claimed and edited — it
  only fills in profiles that don't exist yet.
- **`lib/profiles.ts`**: the only access point to `Profile` data (same convention as
  `lib/members.ts` for static data), plus `resolveMemberDisplay()`, which merges a
  `Profile` row's fields over the static `Member` object so existing components
  (`MemberHeader`, `ProfileContent`, `AmbientBackground`, etc.) render unchanged —
  they just receive already-merged data.
- **Claiming**: on `/members/[slug]`, a signed-in visitor sees "Заявити профіль" if the
  profile is unclaimed, or "Редагувати профіль" if they own it. Claiming
  (`actions/profile.ts`'s `claimProfileAction`) is an atomic `updateMany` guarded by
  `WHERE userId IS NULL`, so two simultaneous claims on the same profile can never both
  succeed, and a user who already owns a different profile is stopped before the write
  with a clear message rather than a raw constraint error.
- **Editing**: `/profile/edit` requires both a session and an owned `Profile` (checked
  in the page itself — see `middleware.ts`'s existing comment on why middleware is only
  ever the UX layer, never the security boundary). The form covers every editable field
  from the requirements; social links reuse `lib/social-icons.ts`'s existing platform
  list and order.
- **`/profile`** now branches on whether the signed-in user owns a `Profile` instead of
  always showing the Phase 2 placeholder: it links out to the member page and the edit
  page if claimed, or points back to the member index if not.
- **External avatar/banner URLs**: once avatars are editable, a member can paste any
  image URL — not just a local `/public` path. `lib/utils.ts`'s `isExternalUrl()` is
  used to pass `unoptimized` to `next/image` for those, so they render without needing
  `next.config.mjs`'s `images.remotePatterns` allowlist expanded to a wildcard.

### What this phase deliberately does not touch

Per the brief: no changes to `lib/auth.ts`, `middleware.ts`, the Auth.js-adapter models
(`User`'s existing columns, `Account`, `Session`, `VerificationToken`), or the sign-in
flow. `User` only gained the reverse `profile Profile?` relation field, which was
already anticipated by a comment in the original schema. Comments, roles, moderation,
likes, notifications, and Discord server integration are still out of scope, same as
before.

## Phase 4 — Discord Server Integration

Read-only sync of Discord **server (guild) membership** onto the `Profile` model, plus
the UI to display it. No changes to authentication, the UI's visual design, or to
comments/moderation/roles — all explicitly out of scope for this phase.

### What's new

- **Discord Bot integration** (`lib/discord.ts`'s `getGuildMember()`): a bot-token-
  authenticated call to Discord's REST API (`GET /guilds/{guild.id}/members/{user.id}`)
  — a separate credential from the OAuth login flow, since a user's own OAuth token
  isn't scoped to answer "are you in our server." See `docs/DISCORD_SETUP.md` for full
  setup (bot creation, invite, required env vars).
- **`Profile` gains four columns** (`prisma/schema.prisma`,
  `prisma/migrations/20260706120000_add_discord_membership/`): `serverMember`
  (boolean), `serverJoinedAt` (nullable), `discordRoles` (JSON array of role IDs —
  stored now, not rendered anywhere yet, so a future role-based-UI phase doesn't need
  another migration), and `discordSyncedAt` (when these were last successfully
  written). Run `npx prisma migrate dev` to apply it.
- **`lib/discord-sync.ts`**'s `syncDiscordMembership(userId)` is the single function
  that writes those columns. Every trigger point below calls this — none of them talk
  to `lib/discord.ts` or Prisma directly:
  - **On login** — a non-blocking call added inside `lib/auth.ts`'s existing
    `events.signIn` hook. It only adds a side effect after the session is already
    established; nothing about how sign-in itself works changed. Wrapped in
    `try/catch` so a Discord outage can never fail or delay login.
  - **When the user visits `/profile`** — every load re-syncs before rendering.
  - **Manually** — `actions/discord.ts`'s `refreshDiscordMembershipAction`, wired to
    the "Оновити статус Discord" button on `/profile`.
- **Never trusts the client**: the only input any of the above takes is the signed-in
  session's `userId`. `serverMember`/`serverJoinedAt`/`discordRoles` are written only
  from what Discord's bot API returns — there's no path from a form field or request
  body to those columns.
- **Graceful degradation**: if Discord is unreachable, rate-limited, or misconfigured,
  `syncDiscordMembership` leaves the Profile's existing values untouched rather than
  resetting membership to `false` (see its comments and `docs/DISCORD_SETUP.md`'s
  troubleshooting section) — a transient outage never makes a real member look like
  they left.
- **`components/members/DiscordBadge.tsx`**: green "Учасник Discord серверу" badge when
  `serverMember` is true, gray "Не приєднався до Discord серверу" badge plus a "Join
  Discord" link (to `DISCORD_INVITE`) when false. Reuses the existing pill/button
  styling already used for skills and the claim/edit buttons — no new visual language
  introduced.
- **Displayed on every claimed profile**: `MemberHeader` (public `/members/[slug]`
  pages) and `/profile` (the signed-in member's own dashboard) both render the badge.
  Unclaimed profiles show no badge at all — there's no Discord identity attached to
  check membership for.

### What this phase deliberately does not touch

No changes to `lib/auth.ts`'s providers/callbacks/session strategy, `middleware.ts`,
the visual design system (`tailwind.config.ts`'s token set is untouched — the badge
uses Tailwind's built-in `emerald` shade rather than a new brand color), or any
existing component's layout beyond the two new optional slots
(`MemberHeader`'s `discordBadge` prop, `/profile`'s new badge/refresh block). Comments,
moderation, and role-based UI/permissions are still out of scope — `discordRoles` is
captured for a future phase to build on, not used anywhere yet.

