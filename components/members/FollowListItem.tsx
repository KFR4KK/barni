import Image from "next/image";
import Link from "next/link";
import { buildProfileURL, isExternalUrl } from "@/lib/utils";
import type { FollowListEntry } from "@/lib/follows";

interface FollowListItemProps {
  entry: FollowListEntry;
}

// Phase 5.2 — one row inside FollowListModal. Not a reuse of
// components/members/MemberRow.tsx: that component is built around the
// static `Member` type (local avatar path, curated skills line, etc.),
// which doesn't fit a follow-list entry — some of these users haven't
// claimed a Profile at all, so there's no Member data for them. This
// keeps the same visual language (avatar treatment, font tokens, hover
// state) instead of introducing a new one, per the brief's "reuse
// existing profile components where possible" — DiscordBadge itself IS
// reused directly, unchanged, for the one piece that's a genuine
// component rather than layout.
export function FollowListItem({ entry }: FollowListItemProps) {
  const avatarSrc = entry.avatarUrl;

  const content = (
    <div className="flex items-start gap-4 px-1 py-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-graphite">
        {avatarSrc && (
          <Image
            src={avatarSrc}
            alt={entry.displayName}
            fill
            sizes="48px"
            className="object-cover"
            unoptimized={isExternalUrl(avatarSrc)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base text-bone">{entry.displayName}</p>
        <p className="font-sans text-xs text-ash">@{entry.username}</p>
        {entry.bio && <p className="mt-1 line-clamp-2 font-sans text-sm text-ash/80">{entry.bio}</p>}
      </div>
    </div>
  );

  // No claimed profile means no page to link to — render the row plainly
  // rather than as a dead or misleading link.
  if (!entry.profileUsername) {
    return <div className="border-b border-line/60 last:border-b-0">{content}</div>;
  }

  return (
    <Link
      href={buildProfileURL(entry.profileUsername)}
      className="block rounded-md border-b border-line/60 transition-colors duration-fast last:border-b-0 hover:bg-graphite/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
    >
      {content}
    </Link>
  );
}
