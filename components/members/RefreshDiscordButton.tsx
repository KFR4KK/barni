import { refreshDiscordMembershipAction } from "@/actions/discord";

// A plain <form action={...}> calling a Server Action, no client JS —
// same shape as SignInButton/EditProfileButton.
//
// Phase 9.5 — Profile Auto-Provisioning. Rendered from
// app/members/[slug]/page.tsx's owner actions row (was app/profile/page.tsx,
// before that page became a pure redirect — see its own comment). This is
// now the ONLY way to trigger a Discord membership sync outside of
// lib/auth.ts's `signIn` event (which still runs passively on every
// login) — there's no longer a page that re-checks it just by being
// visited, so a member who just joined the Discord server and doesn't
// want to wait for their next login clicks this instead.
export function RefreshDiscordButton() {
  return (
    <form action={refreshDiscordMembershipAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ash underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        Оновити статус Discord
      </button>
    </form>
  );
}
