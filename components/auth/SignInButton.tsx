import Link from "next/link";
import { MessageCircle } from "lucide-react";

// Account Linking — now links to /login (the unified sign-in/sign-up
// entry point, section 11 of that brief — see app/login/page.tsx and
// components/auth/LoginForm.tsx) instead of jumping straight into
// Discord OAuth. Discord is still one tap away from there; this just
// stops assuming Discord is the only way in.
export function SignInButton() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      Увійти
    </Link>
  );
}
