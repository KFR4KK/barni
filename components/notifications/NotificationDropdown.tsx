"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { NotificationView } from "@/lib/notifications";

interface NotificationDropdownProps {
  /** Server-resolved count at page load, so the badge shows correctly
   * before the client has fetched anything — same role as
   * FollowSection's `initialFollowersCount`. Refined by every GET/PATCH
   * response after that. */
  initialUnreadCount: number;
}

type ListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; notifications: NotificationView[] };

// Phase 7.4 — Notifications Foundation.
//
// Combines two patterns already in this codebase rather than inventing a
// third: the open/close + outside-click/Escape handling from
// components/auth/UserMenu.tsx, and the fetch-on-open list loading from
// components/members/FollowListModal.tsx. The bell lives in the same
// header slot as UserMenu (see components/auth/AuthNav.tsx), so it
// deliberately mirrors that component's exact dropdown chrome (position,
// border, background, shadow) rather than introducing a second dropdown
// style next to it.
export function NotificationDropdown({ initialUnreadCount }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [list, setList] = useState<ListState>({ status: "idle" });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setList({ status: "loading" });

    fetch("/api/notifications")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ notifications: NotificationView[]; unreadCount: number }>;
      })
      .then((data) => {
        if (cancelled) return;
        setList({ status: "loaded", notifications: data.notifications });
        setUnreadCount(data.unreadCount);
      })
      .catch((err) => {
        console.error("[notifications] failed to load list:", err);
        if (!cancelled) setList({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
    // Re-fetches every time the dropdown opens, same tradeoff
    // FollowListModal makes and documents on its own effect — one
    // request per open, not a request per keystroke or a cache to keep
    // fresh some other way.
  }, [open]);

  async function handleOpenNotification(notification: NotificationView) {
    setOpen(false);
    if (notification.read) return;

    // Optimistic: the item already looked read the instant it was
    // clicked (see NotificationItem, which doesn't wait on this), so
    // just keep local state in sync and let the request happen in the
    // background — there's no link back to this page to revert to if it
    // fails, same as clicking through a link anywhere else in the app.
    setUnreadCount((count) => Math.max(0, count - 1));
    setList((current) =>
      current.status === "loaded"
        ? {
            status: "loaded",
            notifications: current.notifications.map((entry) =>
              entry.id === notification.id ? { ...entry, read: true } : entry
            ),
          }
        : current
    );

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    } catch (err) {
      console.error("[notifications] failed to mark as read:", err);
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0) return;

    setUnreadCount(0);
    setList((current) =>
      current.status === "loaded"
        ? {
            status: "loaded",
            notifications: current.notifications.map((entry) => ({ ...entry, read: true })),
          }
        : current
    );

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    } catch (err) {
      console.error("[notifications] failed to mark all as read:", err);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Сповіщення"
        className="relative flex items-center justify-center rounded-md p-2 transition-colors duration-fast hover:bg-charcoal focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        <Bell className="h-5 w-5 text-ash" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 font-mono text-[10px] font-medium leading-none text-charcoal">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-card border border-line bg-charcoal shadow-card"
        >
          <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ash">Сповіщення</p>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider text-ash transition-colors duration-fast hover:text-brass disabled:cursor-default disabled:opacity-40 disabled:hover:text-ash"
              )}
            >
              Позначити всі як прочитані
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {list.status === "loading" && (
              <p className="px-4 py-6 text-center font-mono text-xs text-ash">Завантаження…</p>
            )}

            {list.status === "error" && (
              <p className="px-4 py-6 text-center font-mono text-xs text-ash">
                Не вдалося завантажити сповіщення.
              </p>
            )}

            {list.status === "loaded" && list.notifications.length === 0 && (
              <p className="px-4 py-6 text-center font-mono text-xs text-ash">
                Поки що немає сповіщень.
              </p>
            )}

            {list.status === "loaded" &&
              list.notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpenNotification}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
