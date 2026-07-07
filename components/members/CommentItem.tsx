import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DiscordBadge } from "@/components/members/DiscordBadge";
import { buildProfileURL, formatRelativeTime, isExternalUrl } from "@/lib/utils";
import type { FollowListEntry } from "@/lib/follows";

interface CommentItemProps {
  content: string;
  createdAt: string | Date;
  author: FollowListEntry;
  /** Is this particular comment's author the owner of the thing it was
   * left on (profile or project) — a separate "owner" tag, distinct from
   * any badge belonging to the author's own account. */
  isOwnerAuthor: boolean;
  /** Label for the owner tag above. Defaults to "Profile Owner" (Profile
   * Comments' original wording); Project Comments passes "Project Owner"
   * instead — see app/projects/[slug]/page.tsx's CommentsSection call. */
  ownerLabel?: string;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  /** Reply toggle/composer for a top-level comment — replies themselves
   * never receive one (one level of nesting only), so this is left
   * undefined when the section component renders a reply. */
  footer?: ReactNode;
  className?: string;
}

// Phase 7.1 — Profile Comments (generalized in Phase 8.1 for reuse by
// Project Comments — see app/projects/[slug]/page.tsx). One row, reused
// for both a top-level comment and a reply (CommentsSection.tsx renders
// replies slightly indented, with no `footer`) — same "one component
// either way, just fewer slots filled in" as lib/profile-comments.ts's
// `replies` typing. Also reused verbatim, not forked, for Project
// Comments — nothing here is Profile-specific anymore except the
// default `ownerLabel`.
//
// Not a reuse of components/members/FollowListItem.tsx: that component
// is a link to a whole other profile with a bio underneath; this is one
// message inside a thread with its own delete affordance. Keeps the same
// avatar treatment and type tokens rather than inventing a new visual
// language, same reasoning FollowListItem itself already gives for not
// reusing MemberRow.
export function CommentItem({
  content,
  createdAt,
  author,
  isOwnerAuthor,
  ownerLabel = "Profile Owner",
  canDelete,
  isDeleting,
  onDelete,
  footer,
  className,
}: CommentItemProps) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-graphite">
          {author.avatarUrl && (
            <Image
              src={author.avatarUrl}
              alt={author.displayName}
              fill
              sizes="40px"
              className="object-cover"
              unoptimized={isExternalUrl(author.avatarUrl)}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {author.profileSlug ? (
              <Link
                href={buildProfileURL(author.profileSlug)}
                className="font-serif text-sm text-bone transition-colors duration-fast hover:text-brass"
              >
                {author.displayName}
              </Link>
            ) : (
              <span className="font-serif text-sm text-bone">{author.displayName}</span>
            )}
            <span className="font-mono text-[11px] text-ash">@{author.username}</span>

            {isOwnerAuthor && (
              <span className="rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass">
                {ownerLabel}
              </span>
            )}
            {/* Only the green "member" state, not the full DiscordBadge
                (which also renders a gray "not joined" pill + Join
                Discord link when false) — that's appropriate next to
                Follow/Discord-section on a profile header, but repeating
                a "hasn't joined" call-to-action under every single
                non-member's comment would be noise a comment thread
                doesn't need. The badge component itself is untouched. */}
            {author.profileSlug && author.serverMember && <DiscordBadge serverMember compact />}

            <span className="font-mono text-[11px] text-ash">· {formatRelativeTime(createdAt)}</span>
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-bone/90">
            {content}
          </p>

          <div className="mt-2 flex items-center gap-4">
            {footer}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="font-mono text-[11px] uppercase tracking-wider text-ash transition-colors duration-fast hover:text-brass disabled:opacity-60"
              >
                {isDeleting ? "Видалення…" : "Видалити"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
