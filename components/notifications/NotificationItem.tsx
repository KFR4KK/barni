"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { cn, formatRelativeTime, isExternalUrl } from "@/lib/utils";
import type { NotificationView } from "@/lib/notifications";

interface NotificationItemProps {
  notification: NotificationView;
  onOpen: (notification: NotificationView) => void;
}

// Phase 7.4 — Notifications Foundation. Not a reuse of
// components/members/CommentItem.tsx or FollowListItem.tsx: this row has
// its own read/unread visual state and a single fully-composed message
// string (rather than a name + separate structured content), so it's its
// own small component — same reasoning FollowListItem itself gives for
// not reusing MemberRow. Keeps the same avatar treatment and type tokens
// as both of those, though, rather than inventing a new visual language.
export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const { actor, message, read, createdAt } = notification;

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors duration-fast",
        !read && "bg-brass/[0.06]"
      )}
    >
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-graphite">
        {actor.avatarUrl ? (
          <Image
            src={actor.avatarUrl}
            alt={actor.displayName}
            fill
            sizes="36px"
            className="object-cover"
            unoptimized={isExternalUrl(actor.avatarUrl)}
          />
        ) : (
          <UserRound className="h-full w-full p-1.5 text-ash" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm leading-snug text-bone/90">{message}</p>
        <p className="mt-1 font-mono text-[11px] text-ash">{formatRelativeTime(createdAt)}</p>
      </div>

      {!read && (
        <span
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass"
          aria-hidden="true"
        />
      )}
    </div>
  );

  const className = "block w-full border-b border-line/60 text-left last:border-b-0 hover:bg-graphite/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2";

  // Every notification marks itself read on open, per the brief — even
  // one with no href (its target was deleted, or the actor never
  // claimed a Profile), so `onOpen` always fires; only the navigation
  // itself is conditional on `href`.
  if (notification.href) {
    return (
      <Link href={notification.href} onClick={() => onOpen(notification)} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(notification)} className={className}>
      {content}
    </button>
  );
}
