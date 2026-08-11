/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 12 — Profile Redesign. actions/profile.ts's updateProfileAction
  // is a plain <form action={...}> Server Action that accepts the
  // banner/music/widget-media <input type="file"> fields directly as
  // FormData — no separate /api/uploads round trip for this form (see
  // that action's own comment) — so the whole multipart body, file
  // included, has to fit under Next's Server Actions body limit, not
  // just under lib/storage.ts's own MAX_VIDEO_BYTES/MAX_AUDIO_BYTES.
  // Next's default is 1MB, well under MAX_VIDEO_BYTES (25MB) and
  // MAX_AUDIO_BYTES (15MB) — raised to comfortably clear the largest of
  // the three (banner video) with room for the rest of the form's
  // fields alongside it.
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  images: {
    // Flag icons under /public/images/flags are expected to be SVGs.
    // next/image blocks SVG by default as a security precaution; this is
    // Next's own recommended safe opt-in (no inline scripts allowed).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Discord-hosted avatars (UserMenu) were the first remote image
    // source this project used — scoped to exactly the two CDN hosts
    // Discord actually serves avatars from, not a wildcard. Google
    // sign-in (lib/auth.ts's Google provider) adds a third: Google
    // Account avatars are always served from lh3.googleusercontent.com.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "discordapp.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
