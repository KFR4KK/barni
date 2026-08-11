import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { buildProfileURL, formatRelativeTime, isExternalUrl, cn } from "@/lib/utils";
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
  // Phase 12, point 11 — Comment Likes. All undefined together for
  // Project Comments (which don't pass any of this — see
  // app/projects/[slug]/page.tsx) — the like button only renders when
  // `onToggleLike` is actually provided, so this stays entirely opt-in
  // rather than a second, forked comment-item component.
  likesCount?: number;
  viewerHasLiked?: boolean;
  /** The profile owner is among this comment's likers — rendered as a
   * highlighted (red) heart regardless of the current viewer's own like
   * state, per the brief's "creator appreciation visible". */
  isCreatorLike?: boolean;
  onToggleLike?: () => void;
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
  likesCount,
  viewerHasLiked,
  isCreatorLike,
  onToggleLike,
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
            {author.profileUsername ? (
              <Link
                href={buildProfileURL(author.profileUsername)}
                className="font-serif text-sm text-bone transition-colors duration-fast hover:text-brass"
              >
                {author.displayName}
              </Link>
            ) : (
              <span className="font-serif text-sm text-bone">{author.displayName}</span>
            )}
            <span className="font-sans text-[11px] text-ash">@{author.username}</span>

            {isOwnerAuthor && (
              <span className="rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-brass">
                {ownerLabel}
              </span>
            )}
            <span className="font-sans text-[11px] text-ash">· {formatRelativeTime(createdAt)}</span>
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-bone/90">
            {content}
          </p>

          <div className="mt-2 flex items-center gap-4">
            {onToggleLike && (
              <button
                type="button"
                onClick={onToggleLike}
                aria-pressed={viewerHasLiked}
                aria-label={
                  isCreatorLike
                    ? "Автор профілю вподобав цей коментар"
                    : viewerHasLiked
                      ? "Прибрати вподобання"
                      : "Вподобати"
                }
                className="inline-flex items-center gap-1 font-sans text-[11px] uppercase tracking-wider text-ash transition-colors duration-fast hover:text-brass"
              >
                <Heart
                  size={12}
                  className={cn(
                    isCreatorLike
                      ? "fill-red-500 text-red-500"
                      : viewerHasLiked
                        ? "fill-brass text-brass"
                        : "text-ash"
                  )}
                />
                {Boolean(likesCount) && <span>{likesCount}</span>}
              </button>
            )}
            {footer}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="font-sans text-[11px] uppercase tracking-wider text-ash transition-colors duration-fast hover:text-brass disabled:opacity-60"
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
