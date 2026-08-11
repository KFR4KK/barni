import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/auth/SignInButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
    <div className="flex items-center gap-1">
      {/* Phase 7.4 — Notifications Foundation. Signed-out visitors have
          no notifications to see, so this only ever renders next to
          UserMenu, never in the SignInButton branch above. */}
      <NotificationBell userId={session.user.id} />
      <UserMenu
        username={session.user.username}
        displayName={session.user.displayName}
        avatarUrl={session.user.avatarUrl}
      />
    </div>
  );
}
