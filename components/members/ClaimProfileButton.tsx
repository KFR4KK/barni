import { claimProfileAction } from "@/actions/profile";

interface ClaimProfileButtonProps {
  slug: string;
}

// Same shape as components/auth/SignInButton.tsx: a plain
// <form action={...}> calling a Server Action, no client JS. The slug is
// bound to the action ahead of time since a form action only ever
// receives the FormData, not extra arguments.
export function ClaimProfileButton({ slug }: ClaimProfileButtonProps) {
  const claimThisProfile = claimProfileAction.bind(null, slug);

  return (
    <form action={claimThisProfile}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        Заявити профіль
      </button>
    </form>
  );
}
