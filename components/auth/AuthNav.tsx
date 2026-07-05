import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserMenu } from "@/components/auth/UserMenu";

// The single place that decides "logged in vs. logged out" for the nav.
// An async server component, not client-side session fetching — the
// session is already known at render time, so there's no loading flicker
// and no client-side auth check to keep in sync with the server.
export async function AuthNav() {
  const session = await auth();

  if (!session?.user) {
    return <SignInButton />;
  }

  return (
    <UserMenu
      username={session.user.username}
      displayName={session.user.displayName}
      avatarUrl={session.user.avatarUrl}
    />
  );
}
