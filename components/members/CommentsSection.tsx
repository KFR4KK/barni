"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { formFieldClasses } from "@/lib/form-styles";
import { MAX_COMMENT_LENGTH } from "@/lib/profile-comments";
import type { FollowListEntry } from "@/lib/follows";
import { CommentItem } from "@/components/members/CommentItem";

interface Viewer {
  id: string;
}

// Structural, not imported from lib/profile-comments.ts — both
// ProfileCommentWithAuthor/ProfileReplyWithAuthor (lib/profile-comments.ts)
// and ProjectCommentWithAuthor/ProjectReplyWithAuthor (lib/project-comments.ts)
// already match this shape exactly, so either can be passed in as
// `initialComments` with no conversion. Keeping the shape declared once
// here, rather than re-exporting one target's types for the other to
// import, is the "small shared UI component" the brief allows without
// merging the two data-layer modules themselves.
interface ReplyWithAuthor {
  id: string;
  content: string;
  createdAt: string | Date;
  authorId: string;
  author: FollowListEntry;
  // Phase 12, point 11 — Comment Likes. Optional: Project Comments'
  // ProjectReplyWithAuthor (lib/project-comments.ts) doesn't have these
  // fields at all, and that's fine — see likesEnabled below, which is
  // what actually gates whether the like button renders.
  likesCount?: number;
  viewerHasLiked?: boolean;
  isCreatorLike?: boolean;
}

interface CommentWithAuthor extends ReplyWithAuthor {
  replies: ReplyWithAuthor[];
}

interface CommentsSectionProps {
  /** Collection endpoint for this thread — GET lists, POST creates.
   * `/api/users/${username}/profile-comments` for Profile Comments,
   * `/api/projects/${slug}/comments` for Project Comments. */
  endpoint: string;
  /** Base path for deleting one comment by id; `/${commentId}` is
   * appended. `/api/profile-comments` or `/api/project-comments`. Also
   * the base for the like endpoint when `likesEnabled` — see
   * handleToggleLike below. */
  deleteBasePath: string;
  /** The id of whoever can delete *any* comment in this thread — the
   * profile's own User.id, or the project's authorId (same key
   * Follow/Projects already use — see prisma/schema.prisma's comment on
   * ProfileComment for why this is a User.id). */
  ownerId: string;
  /** Passed straight through to CommentItem's `ownerLabel` — defaults to
   * "Profile Owner" there, so this only needs to be set for Project
   * Comments' "Project Owner". */
  ownerLabel?: string;
  initialComments: CommentWithAuthor[];
  /** Null when signed out — hides the composer/reply/delete affordances
   * entirely, same pattern FollowSection's `canFollow` already uses. */
  viewer: Viewer | null;
  /** Phase 12, point 11 — Comment Likes. Off by default — only Profile
   * Comments (app/members/[slug]/page.tsx) turns this on; Project
   * Comments renders exactly as it did before this phase. When true,
   * `POST/DELETE ${deleteBasePath}/${commentId}/like` must exist (see
   * app/api/profile-comments/[commentId]/like/route.ts). */
  likesEnabled?: boolean;
}

const POST_ERROR_MESSAGE = "Не вдалося опублікувати комментар. Спробуйте ще раз.";

interface CreatedCommentResponse extends ReplyWithAuthor {
  parentId: string | null;
}

// Phase 7.1 — Profile Comments, generalized in Phase 8.1 to also back
// Project Comments (app/projects/[slug]/page.tsx passes the
// project-specific endpoint/deleteBasePath/ownerId/ownerLabel — same
// "server page owns the props, this component doesn't know which target
// it's rendering for" split as ProfileContent/ProjectsSection already
// use). Nothing below is Profile-specific anymore; `endpoint` and
// `deleteBasePath` are what used to be hardcoded from `username`.
//
// Fetches nothing itself on mount — the caller's server page already
// loads the full list server-side and passes it in as `initialComments`,
// the same "server fetches, client component only handles what changes
// after that" split FollowSection already established for Follow state.
// Every mutation below (post/reply/delete) updates local state directly
// from the API response instead of refetching the whole list.
export function CommentsSection({
  endpoint,
  deleteBasePath,
  ownerId,
  ownerLabel,
  initialComments,
  viewer,
  likesEnabled = false,
}: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [composerValue, setComposerValue] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyValue, setReplyValue] = useState("");
  const [isReplyPosting, setIsReplyPosting] = useState(false);
  const [replyError, setReplyError] = useState(false);

  // Tracked as a Set, not a single id, so deleting a top-level comment
  // and one of its replies at (nearly) the same time doesn't have one
  // request's pending state clobber the other's.
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function postComment(content: string, parentId: string | null): Promise<boolean> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    if (!response.ok) return false;

    const data: { comment: CreatedCommentResponse } = await response.json();

    if (data.comment.parentId) {
      const reply: ReplyWithAuthor = {
        id: data.comment.id,
        content: data.comment.content,
        createdAt: data.comment.createdAt,
        authorId: data.comment.authorId,
        author: data.comment.author,
        likesCount: data.comment.likesCount,
        viewerHasLiked: data.comment.viewerHasLiked,
        isCreatorLike: data.comment.isCreatorLike,
      };
      setComments((current) =>
        current.map((comment) =>
          comment.id === data.comment.parentId
            ? { ...comment, replies: [...comment.replies, reply] }
            : comment
        )
      );
    } else {
      const newComment: CommentWithAuthor = {
        id: data.comment.id,
        content: data.comment.content,
        createdAt: data.comment.createdAt,
        authorId: data.comment.authorId,
        author: data.comment.author,
        likesCount: data.comment.likesCount,
        viewerHasLiked: data.comment.viewerHasLiked,
        isCreatorLike: data.comment.isCreatorLike,
        replies: [],
      };
      // New top-level comments first — matches the "newest first" order
      // both getProfileComments and getProjectComments query with.
      setComments((current) => [newComment, ...current]);
    }

    return true;
  }

  async function handleSubmitComment(event: FormEvent) {
    event.preventDefault();
    if (isPosting) return;

    const trimmed = composerValue.trim();
    if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return;

    setIsPosting(true);
    setPostError(false);
    try {
      const ok = await postComment(trimmed, null);
      if (!ok) throw new Error("post failed");
      setComposerValue("");
    } catch (err) {
      console.error("[comments] failed to post comment:", err);
      setPostError(true);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleSubmitReply(event: FormEvent, parentId: string) {
    event.preventDefault();
    if (isReplyPosting) return;

    const trimmed = replyValue.trim();
    if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return;

    setIsReplyPosting(true);
    setReplyError(false);
    try {
      const ok = await postComment(trimmed, parentId);
      if (!ok) throw new Error("reply failed");
      setReplyValue("");
      setReplyTargetId(null);
    } catch (err) {
      console.error("[comments] failed to post reply:", err);
      setReplyError(true);
    } finally {
      setIsReplyPosting(false);
    }
  }

  async function handleDelete(commentId: string, parentId: string | null) {
    if (deletingIds.has(commentId)) return;

    setDeletingIds((current) => new Set(current).add(commentId));
    try {
      const response = await fetch(`${deleteBasePath}/${commentId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

      if (parentId) {
        setComments((current) =>
          current.map((comment) =>
            comment.id === parentId
              ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) }
              : comment
          )
        );
      } else {
        setComments((current) => current.filter((comment) => comment.id !== commentId));
      }
    } catch (err) {
      console.error("[comments] failed to delete comment:", err);
      // Left in place on failure — no separate "delete failed" banner
      // per comment; the button just stops spinning and can be retried.
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(commentId);
        return next;
      });
    }
  }

  function canDelete(authorId: string): boolean {
    return Boolean(viewer) && (viewer!.id === authorId || viewer!.id === ownerId);
  }

  // Phase 12, point 11 — Comment Likes. Optimistic: flips
  // viewerHasLiked/likesCount immediately (the click needs to feel
  // instant), then fires the request; on failure, reverts by flipping
  // both back rather than refetching the whole thread.
  async function handleToggleLike(commentId: string, parentId: string | null) {
    if (!viewer) return;

    function applyToggle<T extends ReplyWithAuthor>(comment: T): T {
      if (comment.id !== commentId) return comment;
      const wasLiked = comment.viewerHasLiked ?? false;
      return {
        ...comment,
        viewerHasLiked: !wasLiked,
        likesCount: (comment.likesCount ?? 0) + (wasLiked ? -1 : 1),
      };
    }

    const wasLiked =
      (parentId
        ? comments.find((c) => c.id === parentId)?.replies.find((r) => r.id === commentId)
        : comments.find((c) => c.id === commentId)
      )?.viewerHasLiked ?? false;

    setComments((current) =>
      current.map((comment) =>
        parentId
          ? comment.id === parentId
            ? { ...comment, replies: comment.replies.map(applyToggle) }
            : comment
          : applyToggle(comment)
      )
    );

    try {
      const response = await fetch(`${deleteBasePath}/${commentId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error(`Like toggle failed: ${response.status}`);
    } catch (err) {
      console.error("[comments] failed to toggle like:", err);
      // Revert — apply the exact same toggle again to undo it.
      setComments((current) =>
        current.map((comment) =>
          parentId
            ? comment.id === parentId
              ? { ...comment, replies: comment.replies.map(applyToggle) }
              : comment
            : applyToggle(comment)
        )
      );
    }
  }

  return (
    <section aria-labelledby="profile-comments-heading">
      <h2
        id="profile-comments-heading"
        className="font-display text-base font-normal lowercase text-bone"
      >
        Коментарі
      </h2>

      {viewer && (
        <form onSubmit={handleSubmitComment} className="mt-5 flex flex-col gap-2">
          <textarea
            value={composerValue}
            onChange={(event) => setComposerValue(event.target.value)}
            placeholder="Напишіть щось приємне..."
            maxLength={MAX_COMMENT_LENGTH}
            rows={3}
            className={formFieldClasses}
          />
          <div className="flex items-center justify-between">
            {postError ? (
              <p className="font-sans text-xs text-brass">{POST_ERROR_MESSAGE}</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={isPosting || !composerValue.trim()}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-sans text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass disabled:opacity-60"
            >
              {isPosting ? "Публікація…" : "Опублікувати"}
            </button>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <p className="mt-5 font-sans text-sm text-ash">Тут поки що немає жодного комментаря.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                content={comment.content}
                createdAt={comment.createdAt}
                author={comment.author}
                isOwnerAuthor={comment.authorId === ownerId}
                ownerLabel={ownerLabel}
                canDelete={canDelete(comment.authorId)}
                isDeleting={deletingIds.has(comment.id)}
                onDelete={() => handleDelete(comment.id, null)}
                likesCount={likesEnabled ? comment.likesCount : undefined}
                viewerHasLiked={likesEnabled ? comment.viewerHasLiked : undefined}
                isCreatorLike={likesEnabled ? comment.isCreatorLike : undefined}
                onToggleLike={likesEnabled && viewer ? () => handleToggleLike(comment.id, null) : undefined}
                footer={
                  viewer ? (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTargetId((current) => (current === comment.id ? null : comment.id))
                      }
                      className="font-sans text-[11px] uppercase tracking-wider text-ash transition-colors duration-fast hover:text-brass"
                    >
                      Відповісти
                    </button>
                  ) : undefined
                }
              />

              {comment.replies.length > 0 && (
                <div className="mt-4 flex flex-col gap-4 border-l border-line/60 pl-4">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      content={reply.content}
                      createdAt={reply.createdAt}
                      author={reply.author}
                      isOwnerAuthor={reply.authorId === ownerId}
                      ownerLabel={ownerLabel}
                      canDelete={canDelete(reply.authorId)}
                      isDeleting={deletingIds.has(reply.id)}
                      onDelete={() => handleDelete(reply.id, comment.id)}
                      likesCount={likesEnabled ? reply.likesCount : undefined}
                      viewerHasLiked={likesEnabled ? reply.viewerHasLiked : undefined}
                      isCreatorLike={likesEnabled ? reply.isCreatorLike : undefined}
                      onToggleLike={
                        likesEnabled && viewer ? () => handleToggleLike(reply.id, comment.id) : undefined
                      }
                    />
                  ))}
                </div>
              )}

              {replyTargetId === comment.id && (
                <form
                  onSubmit={(event) => handleSubmitReply(event, comment.id)}
                  className="ml-4 mt-4 flex flex-col gap-2 border-l border-line/60 pl-4"
                >
                  <textarea
                    value={replyValue}
                    onChange={(event) => setReplyValue(event.target.value)}
                    placeholder="Напишіть щось приємне..."
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={2}
                    className={formFieldClasses}
                  />
                  <div className="flex items-center justify-between">
                    {replyError ? (
                      <p className="font-sans text-xs text-brass">{POST_ERROR_MESSAGE}</p>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTargetId(null);
                          setReplyValue("");
                          setReplyError(false);
                        }}
                        className="font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:text-bone"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        disabled={isReplyPosting || !replyValue.trim()}
                        className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-sans text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass disabled:opacity-60"
                      >
                        {isReplyPosting ? "Публікація…" : "Відповісти"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
