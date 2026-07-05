import { MessageCircle } from "lucide-react";
import { signInWithDiscord } from "@/actions/auth";

// A plain <form action={...}> calling a Server Action — no client JS,
// no custom OAuth logic, no default/unstyled library UI. Uses the same
// generic-icon convention as SocialLinks (lib/social-icons.ts): a neutral
// Lucide glyph rather than the Discord brand mark, consistent with the
// design system's single-accent, no-third-party-branding rule.
export function SignInButton() {
  return (
    <form action={signInWithDiscord}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Увійти через Discord
      </button>
    </form>
  );
}
