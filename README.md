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

## Phase 5.1 — Follow System

Lets a signed-in user follow/unfollow another user and see Followers/Following counts
on a profile page. No websockets, no notifications, no activity feed, no
recommendations, no followers/following *list* UI — only the counts and the toggle
button, per this phase's brief.

### What's new

- **`Follow` model** (`prisma/schema.prisma`,
  `prisma/migrations/20260706150000_add_follow_system/`): `followerId` / `followingId`,
  both foreign keys onto **`User.id`**, not `Profile.id`. This is deliberate — see the
  long comment on the model itself — because following is something any signed-in
  account can do or receive regardless of whether it has claimed a Profile page, the
  same "identity vs. display content" split the codebase already draws between `User`
  and `Profile`. The consequence: an *unclaimed* Profile has no `User` to follow, so it
  renders no Follow UI at all (same tradeoff Phase 4 made for the Discord badge). A
  compound unique index on `(followerId, followingId)` makes double-following
  impossible at the DB level; a separate index on `followingId` powers the followers
  count. Run `npx prisma migrate dev` to apply it.
- **`lib/follows.ts`**: read-only helpers (`getFollowCounts`, `isFollowing`) used by
  every page that displays follow state — the same "one data-access module" convention
  as `lib/profiles.ts`.
- **`app/api/follow/route.ts`** — `POST`/`DELETE` **Route Handlers**, not Server
  Actions. This is the one deliberate architecture difference from Phase 3/4's write
  paths (`actions/profile.ts`, `actions/discord.ts`), because this phase's brief asks
  for Route Handlers specifically, and a toggling Follow button needs to flip state and
  update a count in place without a full page navigation — something a plain
  `<form action={serverAction}>` doesn't do. Every other write path in the app is
  untouched and still uses Server Actions.
  - Both handlers read the follower's identity only from `auth()`'s session — the
    request body only ever supplies which *other* user to follow/unfollow.
  - Following yourself is rejected (400); following someone already followed, or
    unfollowing someone not followed, is treated as an idempotent success rather than
    an error (safe against double-clicks and repeated requests).
- **`components/members/FollowSection.tsx`** (client component — the only new one
  besides `components/ui/Button.tsx`): renders "X Followers · Y Following" plus a
  Follow/Following button with optimistic updates (flips immediately, reverts if the
  request fails). Uses the existing `border-line`/`border-brass` outline-button
  language already established by `ClaimProfileButton`/`DiscordBadge` — no new colors
  or shapes.
- **Displayed on claimed profiles**: `MemberHeader` (public `/members/[slug]` pages,
  via a new `followSection` slot alongside `discordBadge`) shows counts to everyone and
  the button only to a signed-in visitor who isn't the profile's own owner. `/profile`
  (the signed-in member's own dashboard) shows the same counts as plain text — no
  button, since you can't follow yourself.

### What this phase deliberately does not touch

No changes to `lib/auth.ts`, the visual design system, or any existing Server Action.
`User` only gained two reverse relation fields (`following`/`followers`) for the new
`Follow` model, the same kind of addition `profile Profile?` was in Phase 3. Comments,
moderation, roles, notifications, activity feeds, and followers/following list pages
are still out of scope.

## Phase 5.2 — Followers & Following Lists

Lets anyone click the "X Followers"/"Y Following" counts added in Phase 5.1 to see who
those people actually are. Read-only — no new way to follow/unfollow beyond what
Phase 5.1 already built, no schema changes, no infinite scroll, no pagination.

### What's new

- **No Prisma migration.** Per this phase's brief, the existing `Follow` model (Phase
  5.1) is read exactly as-is — `lib/follows.ts` gained new query functions
  (`getFollowerList`, `getFollowingList`, `getUserByUsername`, `getUsernameByUserId`),
  not new columns or tables.
- **`GET /api/users/[username]/followers`** and **`GET /api/users/[username]/following`**
  (`app/api/users/[username]/{followers,following}/route.ts`) — public, read-only Route
  Handlers returning the same public-facing fields (`displayName`, `username`,
  `avatarUrl`, `bio`, profile link, Discord-membership flag) already visible elsewhere
  on a claimed profile; nothing more sensitive than the counts these lists back into.
  Capped at 1000 rows per list (`FOLLOW_LIST_MAX` in `lib/follows.ts`) as a defensive
  bound, not real pagination — explicitly out of scope for this phase.
  - **Caveat worth flagging explicitly:** `[username]` is resolved with `findFirst`,
    not `findUnique`, because `User.username` isn't a unique column in the current
    schema (see that field's comment in `prisma/schema.prisma`). Discord's own
    username system is globally unique per account in practice, so a real collision
    shouldn't occur — but it isn't enforced at the DB level here, and this phase's
    brief explicitly says not to touch the schema, so this is a known, documented gap
    rather than a silent one. Adding `@unique` to `User.username` in a future phase
    would need its own migration and a check that no two seeded/existing rows already
    collide first.
- **`components/ui/Modal.tsx`** — the project had no Dialog/Modal component before
  this phase (checked first, per the brief). Rather than adding a UI-library
  dependency, this wraps the native `<dialog>` element (`showModal()`), which already
  provides focus trapping and Escape-to-close for free; the one hand-written CSS rule
  (`dialog::backdrop` in `app/globals.css`) reuses the existing `--color-graphite`
  token rather than inventing a new one. Generic, not Follow-specific — reusable by
  any future feature that needs a dialog.
- **`components/members/FollowListModal.tsx`** — fetches one of the two endpoints
  above when opened, renders through `Modal`, and adds a **local-only** search box
  (filters the already-fetched array with `.filter()`, not a request per keystroke)
  once a list has more than 8 entries. Shows the friendly empty states from the brief
  ("No followers yet." / "This user isn't following anyone yet.") when a list is
  genuinely empty, and a separate "no matches" message when search filters everything
  out.
- **`components/members/FollowListItem.tsx`** — one row per user. Reuses
  `components/members/DiscordBadge.tsx` directly, unchanged, for the membership badge
  (only rendered for a claimed profile, same rule Phase 4 established); links to
  `/members/[slug]` when claimed, renders as a plain (non-link) row when not, since
  there's no page to send you to. Not a reuse of `MemberRow.tsx` — that component is
  built around the static `Member` type, which doesn't fit a follow-list entry (some
  of these users have no claimed Profile at all) — but it matches the same visual
  language (avatar treatment, type tokens, hover state) rather than inventing one.
- **`components/members/FollowSection.tsx` (Phase 5.1) updated**: the counts are now
  two buttons that open the corresponding `FollowListModal`, plus a new required
  `username` prop (needed to build the two endpoint URLs above). Used identically on
  both `/members/[slug]` (public) and `/profile` (own dashboard, via `canFollow=false`
  so only the counts/modals show, not a Follow button — you can't follow yourself).

### What this phase deliberately does not touch

The `Follow`/`User`/`Profile` schema, `lib/auth.ts`, `app/api/follow/route.ts`
(Phase 5.1's write path), and the visual design system are all untouched. No infinite
scroll, recommendations, mutual-follow indicators, notifications, or WebSocket — a
list longer than `FOLLOW_LIST_MAX` is truncated, not paginated, which is an accepted
limitation of "don't optimize for tens of thousands of users," per the brief.

## Phase 6.1 — Projects Foundation

The first content model in the app that isn't identity or social-graph state — a
minimal, working `Project` entity (create, edit, view, list on a profile) that later
phases (likes, comments, collections, notifications, the activity feed) attach to.
Deliberately just the foundation: no drafts, no deletion, no Markdown, no file
uploads, no search, no view stats.

### What's new

- **`Project` model + `ProjectVisibility` enum** (`prisma/schema.prisma`): `title`,
  `slug` (globally unique), `description`, `coverImage` (nullable), `visibility`
  (`PUBLIC`/`PRIVATE`, defaults to `PUBLIC`), `createdAt`, `updatedAt`, and `authorId`.
  Keyed to `User.id`, not `Profile.id` — same reasoning as `Follow` (see that model's
  comment): authoring a project doesn't require having claimed a member Profile page.
  `onDelete: Cascade` on the author relation, deliberately different from `Profile`'s
  `onDelete: SetNull` — a Profile is identity-adjacent and meant to survive its User
  being removed, but a Project is content the User authored.
- **Migration**: `prisma/migrations/20260706173000_add_project/`. Run
  `npx prisma migrate dev` to apply it.
- **`lib/projects.ts`** — the one data-access module for `Project`, same convention as
  `lib/profiles.ts`/`lib/follows.ts`. `createProject()` generates a slug from the title
  (`slugify()`, new in `lib/utils.ts` — transliterates Cyrillic to Latin, since project
  titles are free-typed and may be in Ukrainian) and, on a slug collision, **retries the
  actual `create` call** with the next numeric suffix rather than checking availability
  and writing separately — the same idiom `app/api/follow/route.ts` already uses for
  its own unique-constraint conflict, chosen so two concurrent creates of the same title
  can never both slip through a check-then-write gap. `updateProject()` scopes its write
  to `{ id, authorId }` so ownership is enforced by the query itself, not a separate
  check beforehand — never touches `slug` (per the brief: it doesn't change after
  creation, and this phase has no UI to change it manually either).
- **`POST /api/projects`** and **`PATCH /api/projects/[slug]`**
  (`app/api/projects/route.ts`, `app/api/projects/[slug]/route.ts`) — Route Handlers,
  per this phase's brief, not Server Actions: the create/edit form needs the JSON
  response (specifically the generated slug) to navigate to the new project page, which
  a plain `<form action={serverAction}>` doesn't hand back. Same auth pattern as every
  other write path — only `auth()`'s session decides the author; the PATCH route
  double-checks ownership (once for a clean 403, once again at the DB layer inside
  `updateProject()`).
- **`components/projects/ProjectForm.tsx`** (client component) — Title/Description/Cover
  Image on create; adds Visibility on edit. Posts to the routes above via `fetch`,
  redirects to `/projects/[slug]` on success. Reuses `lib/form-styles.ts` (factored out
  of `/profile/edit`'s page, which had the same input styling defined inline — moved
  here so it's defined once, not duplicated a second time for this phase's forms).
- **`components/projects/ProjectCard.tsx`** — deliberately built around only
  `slug`/`title`/`description`/`coverImage`/`visibility`, not the full `Project` row, so
  it can be reused as-is in a future search page, feed, or recommendations list, per the
  brief's "сделать её максимально универсальной" — its first use here is the profile
  page's project grid.
- **`components/projects/ProjectsSection.tsx`** — the "Projects" block: friendly empty
  state (different copy for the profile owner vs. a visitor), a grid of `ProjectCard`s,
  and an owner-only "Новий проєкт" button. Composed alongside `ProfileContent` from
  `app/members/[slug]/page.tsx` (not folded into `ProfileContent.tsx` itself), the same
  way `AwardsSection` already sits beside it rather than inside it.
- **`app/projects/new`**, **`app/projects/[slug]`**, **`app/projects/[slug]/edit`** — the
  three pages. The detail page shows cover image, title, an author byline (the author's
  claimed Profile display name + link when one exists, falling back to their bare
  Discord username otherwise, same pattern as `lib/follows.ts`'s `FollowListEntry`),
  description, and created date. `PRIVATE` projects 404 for anyone who isn't the author
  — without that, the visibility field this phase introduces wouldn't actually do
  anything yet.
- **Displayed on claimed profiles**: `/members/[slug]` fetches the author's projects
  (public ones only, unless the viewer is the profile's own owner, in which case
  `PRIVATE` ones show too) and renders `ProjectsSection` below the bio. `/profile` (the
  signed-in member's own dashboard) gained a plain "Новий проєкт" shortcut button
  alongside the existing "Редагувати профіль" one.

### What this phase deliberately does not touch

No likes, comments, collections, tags, categories, Markdown, file uploads, drag & drop,
image viewer, notifications, project search, recommendations, view-count stats, drafts,
or collaborative editing — all explicitly out of scope per the brief. No changes to
`lib/auth.ts`, `Profile`, `Follow`, or any existing Server Action; `User` only gained a
`projects Project[]` reverse relation, the same kind of addition `following`/`followers`
were in Phase 5.1. Deletion isn't implemented — a project, once created, can be edited
(including hidden via `PRIVATE`) but not removed.

## Phase 6.2 – 6.5 — Project Showcase, Gallery, Uploads, Deletion

*(Delivered before this README section was last touched — see the dated comments in
`prisma/schema.prisma`, `lib/projects.ts`, and `app/api/projects/[slug]/route.ts` for
what each of these four added: showcase metadata (`shortDescription`/`githubUrl`/
`externalUrl`), a `ProjectImage` gallery model with its own upload/delete Route
Handlers, Supabase Storage integration (`lib/storage.ts`), and `DeleteProjectButton`'s
confirm-then-`DELETE` flow.)*

## Phase 7.1 — Profile Comments

Adds a comment thread to `/members/[slug]` (a *Profile*'s comments — not a Project's;
per the brief, that's a separate future phase expected to mirror this one's shape, not
share a table with it). One level of nesting (a comment can have replies; replies
can't). No editing, no likes, no attachments, no notifications, no pagination.

### What's new

- **`ProfileComment` model** (`prisma/schema.prisma`,
  `prisma/migrations/20260706200000_add_profile_comments/`) — `profileUserId`/
  `authorId` are both `User.id` (same reasoning as `Follow`/`Project`: an unclaimed
  Profile has no User, so it gets no Comments section at all — see
  `app/members/[slug]/page.tsx`'s existing `profile?.userId` guard, reused unchanged).
  `parentId` is a nullable self-relation; **one level of nesting is enforced in
  application code** (`lib/profile-comments.ts`'s `createProfileComment`: a reply's
  `parentId` must point at a comment whose own `parentId` is null), not by a DB
  constraint — the schema alone would technically allow deeper chains. Both
  `profileUserId`/`authorId` and the self-relation cascade on delete, so removing a
  User or a top-level comment cleans up everything attached to it without extra code.
  Run `npx prisma migrate dev` to apply it.
  - **Deliberately its own table, not a polymorphic `Comment`** with a
    `targetType`/`targetId` pair Project Comments could also plug into — see the
    model's own comment in the schema for why building that shared engine now, before
    a second comment target exists, would be exactly the premature abstraction the
    brief warns against. What *does* carry forward: the shape and the
    one-module-per-table convention, so Project Comments (next phase) can mirror
    `lib/profile-comments.ts` closely without the two ever needing to share code that
    doesn't naturally want to be shared.
- **One small, explained reuse**: `lib/follows.ts`'s `toFollowListEntry` (the
  User+Profile → `{avatar, displayName, username, profileSlug, serverMember}` mapping
  every list of people in this app already needs) is now exported and reused directly
  by `lib/profile-comments.ts`, instead of being redeclared a second time for comment
  authors. A new `getUserDisplayById()` was added alongside it in `lib/follows.ts` for
  the one new lookup this phase needed (a single user by id, rather than a whole
  Follow-backed list) — this is the one place this phase touched a file outside its own
  new ones, and it's a pure addition (nothing existing changed behavior).
- **Route Handlers**, per the brief: `GET`/`POST /api/users/[username]/profile-comments`
  (list + create-a-comment-or-reply, same body shape either way — `parentId: null` or
  omitted for a top-level comment, set for a reply) and
  `DELETE /api/profile-comments/[commentId]`. `GET` is intentionally public, same
  reasoning as the Followers/Following list endpoints next to it — comments on a
  profile are public content on an already-public page. `POST`/`DELETE` require
  `auth()`; delete is allowed for the comment's own author *or* the profile's owner
  (per the brief), enforced by an `OR`-scoped `deleteMany` in
  `deleteProfileCommentIfAllowed` — the same "ownership enforced by the query itself"
  idiom `updateProject`/`deleteProjectIfOwned` already use, extended to two allowed
  identities instead of one.
- **`formatRelativeTime()`** (new, in `lib/utils.ts`) — щойно / N хв тому / N год тому /
  вчора / N дні тому, then weeks/months/years for anything older, since the brief is
  explicit that comment timestamps never fall back to an absolute date, however old.
  Labels live in a small lookup table keyed by locale (`"uk"` only today) rather than
  inline strings, per "архитектура должна позволять локализацию" — adding a second
  locale means adding a table entry, not touching the function's logic.
- **`components/members/CommentItem.tsx`** — one presentational row, reused for both a
  top-level comment and a reply. Shows the existing Discord badge (only the green
  "member" state — the gray "hasn't joined + Join Discord link" state that
  `DiscordBadge` also renders would be noise repeated under every non-member's comment,
  so this only calls that component when `serverMember` is true; the component itself
  is untouched, no new badge system) plus a new, small "Profile Owner" tag — inlined
  directly rather than extracted into its own component, since it's one `<span>` with
  no second use yet; if Project Comments later needs an analogous "Project Owner" tag,
  that shared pattern would be the natural point to extract a small `RoleBadge`, not
  before.
- **`components/members/CommentsSection.tsx`** (client component) — the composer,
  the list, per-comment reply toggles/composers, and delete buttons. Receives the full
  list pre-fetched from the server (`lib/profile-comments.ts`'s `getProfileComments`,
  called from `app/members/[slug]/page.tsx`) as `initialComments`, then applies each
  post/reply/delete directly to local state from that request's own response — the
  same "server fetches once, client only patches what just changed" split
  `FollowSection` already established, rather than refetching the whole thread after
  every action.
- **Displayed on claimed profiles**: `app/members/[slug]/page.tsx` renders
  `CommentsSection` below `ProjectsSection`, reusing the `ownerUsername` it already
  fetches for `FollowSection`. Signed-out visitors see the thread but no composer, reply
  buttons, or delete buttons — same pattern `FollowSection`'s `canFollow=false` already
  uses for "you can see this, you just can't act on it yet."

### What this phase deliberately does not touch

No editing, likes, GIFs, images, attachments, Markdown/formatting, notifications,
mentions, WebSocket, arbitrarily deep nesting, pinned comments, moderation tooling, or
pagination — all explicitly out of scope per the brief (a `FOLLOW_LIST_MAX`-style
safety cap wasn't added here either, since the brief frames pagination as unnecessary
"if there aren't many comments," not as a defensive bound to add regardless — worth
revisiting if a profile's thread ever grows large in practice). No changes to
`lib/auth.ts`, `Follow`, `Project`, or the visual design system. Project Comments
(explicitly flagged as the next phase) has no code yet — only the shape this phase
leaves behind for it to mirror.


