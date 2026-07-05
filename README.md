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
