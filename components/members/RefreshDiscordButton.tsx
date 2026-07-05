import { refreshDiscordMembershipAction } from "@/actions/discord";

// Same shape as ClaimProfileButton/SignInButton: a plain
// <form action={...}> calling a Server Action, no client JS. This is the
// "manually via a server action" sync trigger from the requirements —
// distinct from the passive sync that already runs whenever `/profile`
// loads (see app/profile/page.tsx), for the case where a member just
// joined the Discord server and doesn't want to wait for their next
// login or page reload.
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
