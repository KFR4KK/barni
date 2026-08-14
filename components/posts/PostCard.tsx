"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  UserRound,
  MessageCircle,
  Eye,
  Heart,
  Share2,
  MoreHorizontal,
  Trash2,
  Link2,
  Flag,
} from "lucide-react";
import { cn, formatRelativeTime, isExternalUrl } from "@/lib/utils";
import type { FollowListEntry } from "@/lib/follows";
import { DiscordBadge } from "@/components/members/DiscordBadge";
import { CommentsSection } from "@/components/members/CommentsSection";
import type { PostCommentWithAuthor } from "@/lib/post-comments";

export interface PostCardPost {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: FollowListEntry;
  /** Feed redesign — derived counts, same shape lib/posts.ts's
   * PostWithAuthor now always carries (see that type's own comment).
   * Optional so the "default" (profile page) variant, which predates
   * these and doesn't render an action bar at all, doesn't force every
   * existing caller to start passing them. */
  likesCount?: number;
  commentsCount?: number;
  viewCount?: number;
  viewerHasLiked?: boolean;
}

interface PostCardProps {
  post: PostCardPost;
  comments?: PostCommentWithAuthor[];
  viewer?: { id: string } | null;
  variant?: "default" | "feed";
  /** Updates page — no report feature there per that page's brief.
   * Defaults to true (every existing "feed" caller keeps showing it). */
  allowReport?: boolean;
}

// Phase 8.0 — Posts Foundation, redesigned for the Feed in Phase 9.3 and
// again for the "Separate Projects Page" era's Feed Redesign brief.
//
// "default" (unset) is untouched from Phase 8.0/9.3 — byte-for-byte the
// same markup the profile page (components/posts/PostsSection.tsx) has
// always rendered, since that page wasn't asked to change here. "feed"
// is the X/Threads-inspired card this redesign actually asks for: bolder
// name + dimmer @handle, time on the right, a three-dot menu, a compact
// action bar (views/likes/comments/share, icons + numbers only, no
// labels), and a real Like toggle against PostLike (see
// lib/post-likes.ts) — the old "feed" variant had no like feature at
// all, since PostLike didn't exist yet.
export function PostCard({ post, comments, viewer, variant = "default", allowReport = true }: PostCardProps) {
  const { author } = post;
  const isFeed = variant === "feed";
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const showComments = comments !== undefined && (!isFeed || expanded);

  const [menuOpen, setMenuOpen] = useState(false);
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const [liked, setLiked] = useState(post.viewerHasLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = Boolean(viewer && viewer.id === author.userId);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) setSharePopoverOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Fires the view-count increment once, the first time this card
  // actually scrolls into view — not on mount (a card rendered off-screen
  // in a long feed shouldn't count as "seen"). No dedup beyond that; see
  // Post.viewCount's own schema comment for why a plain counter is
  // enough here.
  const articleRef = useRef<HTMLElement>(null);
  const hasCountedView = useRef(false);
  useEffect(() => {
    if (!isFeed) return;
    const node = articleRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasCountedView.current) {
          hasCountedView.current = true;
          fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isFeed, post.id]);

  async function handleToggleLike() {
    if (!viewer || isLiking) return;
    setIsLiking(true);
    // Optimistic — same pattern components/projects/LikeButton.tsx
    // already uses, reverted on failure.
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!response.ok) throw new Error(`like failed: ${response.status}`);
      const data: { liked: boolean; likes: number } = await response.json();
      setLiked(data.liked);
      setLikesCount(data.likes);
    } catch (error) {
      console.error("[post-card] like toggle failed:", error);
      setLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`delete failed: ${response.status}`);
      router.refresh();
    } catch (error) {
      console.error("[post-card] delete failed:", error);
      setIsDeleting(false);
    }
  }

  function handleCopyLink() {
    const href = author.profileUsername
      ? `${window.location.origin}/members/${author.profileUsername}#post-${post.id}`
      : window.location.href;
    navigator.clipboard.writeText(href).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    });
  }

  if (!isFeed) {
    return (
      <article
        id={`post-${post.id}`}
        className="flex flex-col gap-3 rounded-card border border-line/60 bg-charcoal/30 p-5"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-graphite">
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt={author.displayName}
                fill
                sizes="36px"
                className="object-cover"
                unoptimized={isExternalUrl(author.avatarUrl)}
              />
            ) : (
              <UserRound className="h-full w-full p-1.5 text-ash" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            {author.profileUsername ? (
              <Link
                href={`/members/${author.profileUsername}`}
                className="truncate font-sans text-sm font-medium text-bone hover:text-brass"
              >
                {author.displayName}
              </Link>
            ) : (
              <p className="truncate font-sans text-sm font-medium text-bone">{author.displayName}</p>
            )}
            <p className="mt-0.5 font-sans text-[11px] text-ash">{formatRelativeTime(post.createdAt)}</p>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-bone/90">{post.content}</p>

        {post.imageUrl && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border border-line/60 bg-graphite">
            <Image
              src={post.imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
              unoptimized={isExternalUrl(post.imageUrl)}
            />
          </div>
        )}

        {showComments && (
          <div className="mt-2 border-t border-line/60 pt-4">
            <CommentsSection
              endpoint={`/api/posts/${post.id}/comments`}
              deleteBasePath="/api/posts/comments"
              ownerId={author.userId}
              ownerLabel="Post Owner"
              initialComments={comments ?? []}
              viewer={viewer ?? null}
            />
          </div>
        )}
      </article>
    );
  }

  return (
    <article
      ref={articleRef}
      id={`post-${post.id}`}
      className="group relative flex flex-col gap-4 rounded-[24px] border border-line/50 bg-charcoal/20 p-6 shadow-card transition-shadow duration-base hover:border-line/80"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-graphite">
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt={author.displayName}
              fill
              sizes="44px"
              className="object-cover"
              unoptimized={isExternalUrl(author.avatarUrl)}
            />
          ) : (
            <UserRound className="h-full w-full p-1.5 text-ash" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {author.profileUsername ? (
              <Link
                href={`/members/${author.profileUsername}`}
                className="truncate font-sans text-[15px] font-semibold text-bone hover:text-brass"
              >
                {author.displayName}
              </Link>
            ) : (
              <p className="truncate font-sans text-[15px] font-semibold text-bone">{author.displayName}</p>
            )}
            <span className="truncate font-sans text-sm text-ash/70">@{author.username}</span>
            {author.profileUsername && author.serverMember && <DiscordBadge serverMember compact />}
          </div>
        </div>

        <span className="shrink-0 font-sans text-xs text-ash">{formatRelativeTime(post.createdAt)}</span>

        {(isOwner || allowReport) && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Більше дій"
              aria-expanded={menuOpen}
            className="-mr-1.5 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
          >
            <MoreHorizontal size={17} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-charcoal py-1 shadow-card">
                {isOwner ? (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setMenuOpen(false);
                      handleDelete();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-brass transition-colors duration-fast hover:bg-graphite disabled:opacity-60"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {isDeleting ? "Видалення…" : "Видалити"}
                  </button>
                ) : (
                  allowReport && (
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
                    >
                      <Flag size={14} aria-hidden="true" />
                      Поскаржитись
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-bone/90">{post.content}</p>

      {/* Compact image — deliberately capped, not full-bleed the way the
         old "feed" variant rendered it (aspect-[16/10] w-full). Structured
         as a grid of one so a future multi-image Post model (see
         Post.imageUrl's own schema comment) slots in here — same
         cover/grid/"+N" treatment components/projects/gallery would use —
         without a new layout to design later. */}
      {post.imageUrl && (
        <div className="grid max-w-sm grid-cols-1 gap-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-[20px] border border-line/60 bg-graphite">
            <Image
              src={post.imageUrl}
              alt=""
              fill
              sizes="384px"
              className="object-cover transition-transform duration-slow group-hover:scale-[1.02]"
              unoptimized={isExternalUrl(post.imageUrl)}
            />
          </div>
        </div>
      )}

      {/* Action bar — icons + numbers only, no labels, per the brief. */}
      <div className="flex items-center gap-5 pt-1">
        <span className="inline-flex items-center gap-1.5 font-sans text-xs text-ash">
          <Eye size={15} aria-hidden="true" />
          {post.viewCount ?? 0}
        </span>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 font-sans text-xs text-ash transition-colors duration-fast hover:text-bone"
        >
          <MessageCircle size={15} aria-hidden="true" />
          {post.commentsCount ?? 0}
        </button>

        <button
          type="button"
          onClick={handleToggleLike}
          disabled={!viewer || isLiking}
          aria-pressed={liked}
          className={cn(
            "inline-flex items-center gap-1.5 font-sans text-xs transition-colors duration-fast disabled:cursor-default",
            liked ? "text-brass" : "text-ash hover:text-bone"
          )}
        >
          <Heart size={15} className={cn(liked && "fill-brass")} aria-hidden="true" />
          {likesCount}
        </button>

        <div ref={shareRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setSharePopoverOpen((prev) => !prev)}
            aria-label="Поділитися"
            aria-expanded={sharePopoverOpen}
            className="inline-flex items-center text-ash transition-colors duration-fast hover:text-bone"
          >
            <Share2 size={15} aria-hidden="true" />
          </button>
          {sharePopoverOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-charcoal py-1 shadow-card">
              <button
                type="button"
                onClick={() => {
                  handleCopyLink();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
              >
                <Link2 size={14} aria-hidden="true" />
                {copyFeedback ? "Скопійовано!" : "Скопіювати посилання"}
              </button>
              {allowReport && (
                <button
                  type="button"
                  onClick={() => setSharePopoverOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-sm text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
                >
                  <Flag size={14} aria-hidden="true" />
                  Поскаржитись
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showComments && (
        <div className="border-t border-line/60 pt-4">
          <CommentsSection
            endpoint={`/api/posts/${post.id}/comments`}
            deleteBasePath="/api/posts/comments"
            ownerId={author.userId}
            ownerLabel="Post Owner"
            initialComments={comments ?? []}
            viewer={viewer ?? null}
          />
        </div>
      )}
    </article>
  );
}
