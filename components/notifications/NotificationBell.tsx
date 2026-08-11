import { getUnreadCount } from "@/lib/notifications";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";

interface NotificationBellProps {
  userId: string;
}

// Phase 7.4 — Notifications Foundation. Same split as
// components/auth/AuthNav.tsx / UserMenu.tsx: an async server component
// resolves what's known at render time (here, just the unread count —
// the list itself is fetched client-side on open, see
// NotificationDropdown), so there's no loading flicker for the one thing
// visible before any interaction: the badge number.
export async function NotificationBell({ userId }: NotificationBellProps) {
  const unreadCount = await getUnreadCount(userId);
  return <NotificationDropdown initialUnreadCount={unreadCount} />;
}
