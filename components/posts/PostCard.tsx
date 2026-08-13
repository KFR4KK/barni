"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserRound, MessageCircle, AlertTriangle } from "lucide-react";
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
}

interface PostCardProps {
  post: PostCardPost;
  /** Phase 8.1 — Post Comments. This post's comment thread, fetched
   * server-side by the caller (app/members/[slug]/page.tsx via
   * lib/post-comments.ts's getPostComments) — same "server page fetches,
   * client component only handles what changes after that" split
   * CommentsSection already uses for Profile/Project Comments.
   *
   * Phase 8.2 — Feed (MVP). Made optional (was required): the Feed's
   * first pass showed published content only, no user actions — so its
   * caller omitted this entirely.
   *
   * Phase 9.3 — Feed Redesign. The Feed now passes this again (reusing
   * getPostComments exactly as the profile page already does — no new
   * data-layer function), so the action bar can show a real comment
   * count. What's new this phase is *when* it's visible on screen — see
   * `variant` below. */
  comments?: PostCommentWithAuthor[];
  /** Null when signed out — hides the composer/reply/delete affordances,
   * passed straight through to CommentsSection. Optional for the same
   * Phase 8.2 reason as `comments` above; only meaningful together with
   * it. */
  viewer?: { id: string } | null;
  /**
   * Phase 9.3 — Feed Redesign (UI only).
   *
   * "default" (unset) renders exactly what this component rendered
   * before this phase — byte-for-byte the same markup/classes — because
   * the profile page (components/posts/PostsSection.tsx) wasn't asked to
   * change and shouldn't visually shift as a side effect of redesigning
   * a different page that happens to share this component.
   *
   * "feed" is the new, denser header (avatar/name/@username/badge),
   * airier card chrome (more padding, the existing `shadow-card` token,
   * hover transitions), and a real action bar — passed only by
   * app/feed/page.tsx. Comments are still rendered by the exact same
   * <CommentsSection>, just collapsed behind a toggle instead of always
   * open, per this phase's brief ("не показывать сразу, открывать по
   * нажатию") — no new comment UI was built for this.
   */
  variant?: "default" | "feed";
}

// Phase 8.0 — Posts Foundation.
//
// Deliberately built around only the fields every future consumer needs
// (id, content, imageUrl, createdAt, author), not the full Post row —
// same "universal card" reasoning as components/projects/ProjectCard.tsx:
// this is its only use today (a profile's Posts section), but per the
// brief it's meant to drop into a future Feed, search results, or a
// user page unchanged. Mostly display, per that phase's brief — the one
// piece of interactivity is Phase 8.1's comment thread below, added the
// same way ProjectCard's project detail page grew one (a CommentsSection
// underneath), not by making this component itself stateful beyond that.
//
// Phase 9.3 — now a client component (was a plain server component):
// the "feed" variant's collapse/expand toggle needs local state. This
// doesn't change what data reaches the browser in any new way — it
// already rendered a client component (CommentsSection) as a child.
export function PostCard({ post, comments, viewer, variant = "default" }: PostCardProps) {
  const { author } = post;
  const isFeed = variant === "feed";

  // Only "feed" ever starts collapsed — the default variant has no
  // toggle at all and simply renders comments inline, same as before
  // this phase.
  const [expanded, setExpanded] = useState(false);
  const showComments = comments !== undefined && (!isFeed || expanded);

  const totalCommentsCount =
    comments?.reduce((total, comment) => total + 1 + comment.replies.length, 0) ?? 0;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line/60 bg-charcoal/30 p-5",
        isFeed &&
          "group gap-5 rounded-[20px] border-line/50 bg-charcoal/20 p-8 shadow-card transition-shadow duration-base hover:border-line/80 hover:shadow-[0_24px_56px_rgba(0,0,0,0.4)]"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full bg-graphite",
            isFeed ? "h-11 w-11" : "h-9 w-9"
          )}
        >
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt={author.displayName}
              fill
              sizes={isFeed ? "44px" : "36px"}
              className="object-cover"
              unoptimized={isExternalUrl(author.avatarUrl)}
            />
          ) : (
            <UserRound className="h-full w-full p-1.5 text-ash" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {author.profileUsername ? (
              <Link
                href={`/members/${author.profileUsername}`}
                className="truncate font-sans text-sm font-medium text-bone hover:text-brass"
              >
                {author.displayName}
              </Link>
            ) : (
              <p className="truncate font-sans text-sm font-medium text-bone">
                {author.displayName}
              </p>
            )}
            {isFeed && (
              <span className="font-sans text-[11px] text-ash">@{author.username}</span>
            )}
            {isFeed && author.profileUsername && author.serverMember && (
              <DiscordBadge serverMember compact />
            )}
          </div>
          <p className="mt-0.5 font-sans text-[11px] text-ash">{formatRelativeTime(post.createdAt)}</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-bone/90">{post.content}</p>

      {post.imageUrl && (
        <div
          className={cn(
            "relative aspect-[16/10] w-full overflow-hidden border border-line/60 bg-graphite",
            isFeed ? "rounded-[16px]" : "rounded-md"
          )}
        >
          <Image
            src={post.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className={cn(
              "object-cover",
              isFeed && "transition-transform duration-slow group-hover:scale-[1.03]"
            )}
            unoptimized={isExternalUrl(post.imageUrl)}
          />
        </div>
      )}

      {/* Phase 9.3 — Feed Redesign. The action bar the brief asks for
         ("сейчас она выглядит слишком пустой"). Only two real, working
         affordances are surfaced:
         - a comment-count toggle, wired to the exact same
           getPostComments data/CommentsSection component the profile
           page already uses, just collapsed by default;
         - a muted, non-interactive "report" label matching the
           mockup's placement (right-aligned, de-emphasized).
         There's deliberately no Like/heart control here: unlike
         Project, there is no PostLike model or API in this codebase —
         only ProjectLike exists (see prisma/schema.prisma) — and this
         phase is explicitly UI-only, so a heart with a real-looking
         counter was not fabricated. See this phase's write-up for the
         full reasoning. */}
      {isFeed && (
        <div className="flex items-center justify-between border-t border-line/60 pt-4">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs transition-colors duration-fast",
              expanded
                ? "border-brass text-brass"
                : "border-line/60 text-ash hover:border-brass hover:text-brass"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {totalCommentsCount}
          </button>

          {/* No report feature exists in this app yet (no model, no
             route) — rendered as inert, non-clickable UI so it matches
             the mockup's layout without pretending to do something it
             can't. */}
          <span
            className="inline-flex cursor-default items-center gap-1.5 font-sans text-[11px] uppercase tracking-wider text-ash/50"
            title="Функція скарг ще не реалізована"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Поскаржитись
          </span>
        </div>
      )}

      {/* Phase 8.1 — Post Comments. Same generic component Profile/Project
         Comments already use — `endpoint`/`deleteBasePath`/`ownerId` are
         this post's, everything else (composer, replies, delete, Discord
         badge via CommentItem) comes for free.

         Phase 9.3 — for the "feed" variant this only renders once
         toggled open (see `showComments` above); the default variant's
         behavior — render whenever `comments` is passed — is unchanged. */}
      {showComments && (
        <div className={cn(!isFeed && "mt-2 border-t border-line/60 pt-4", isFeed && "mt-1")}>
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
