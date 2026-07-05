/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Flag icons under /public/images/flags are expected to be SVGs.
    // next/image blocks SVG by default as a security precaution; this is
    // Next's own recommended safe opt-in (no inline scripts allowed).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Discord-hosted avatars (UserMenu) are the first remote image source
    // this project uses. Scoped to exactly the two CDN hosts Discord
    // actually serves avatars from — not a wildcard.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "discordapp.com" },
    ],
  },
};

export default nextConfig;
