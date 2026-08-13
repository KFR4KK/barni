"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { signInWithDiscord } from "@/actions/auth";

interface LikeButtonProps {
  slug: string;
  initialLiked: boolean;
  initialLikesCount: number;
  /** Whether to render as an interactive toggle at all — false when
   * signed out, same "hide the button, keep the count" split
   * FollowSection's `canFollow` already uses. Signed-out visitors still
   * see the count, just get a sign-in prompt instead of a toggle when
   * they click. */
  canLike: boolean;
}

// Phase 7.3 — Project Likes. Mirrors components/members/FollowSection.tsx's
// toggle shape closely: optimistic update on click, trust the server's
// numbers once the response comes back, revert on failure.
//
// Unlike FollowSection (which renders nothing when `canFollow` is
// false), this always renders a heart + count — per the brief, a
// signed-out visitor still sees the like count, and clicking gets "the
// project's existing UX for suggesting sign-in" rather than the button
// disappearing. That existing UX, per components/auth/SignInButton.tsx,
// is a plain <form action={signInWithDiscord}> — so the signed-out state
// here submits that same Server Action instead of calling the toggle
// API, rather than inventing a new prompt/modal the rest of the app
// doesn't have.
export function LikeButton({ slug, initialLiked, initialLikesCount, canLike }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  async function toggleLike() {
    if (isPending) return;

    const nextLiked = !liked;
    setError(false);
    setIsPending(true);
    // Optimistic: flip the heart and count immediately; only revert if
    // the request actually fails below — same pattern as
    // FollowSection.toggleFollow.
    setLiked(nextLiked);
    setLikesCount((count) => count + (nextLiked ? 1 : -1));

    try {
      const response = await fetch(`/api/projects/${slug}/like`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Like request failed: ${response.status}`);
      }
      const data: { liked: boolean; likes: number } = await response.json();
      // Trust the server's numbers over the optimistic guess, in case
      // another request changed things in between.
      setLiked(data.liked);
      setLikesCount(data.likes);
    } catch (err) {
      console.error("[like] request failed, reverting:", err);
      setLiked(!nextLiked);
      setLikesCount((count) => count + (nextLiked ? -1 : 1));
      setError(true);
    } finally {
      setIsPending(false);
    }
  }

  if (!canLike) {
    return (
      <form action={signInWithDiscord} className="flex flex-col gap-1.5">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-sans text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
          {likesCount}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={toggleLike}
        disabled={isPending}
        aria-pressed={liked}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-4 py-2 font-sans text-xs uppercase tracking-wider transition-colors duration-fast focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60",
          liked
            ? "border-brass text-brass hover:border-line hover:text-bone"
            : "border-line text-bone hover:border-brass hover:text-brass"
        )}
      >
        <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} aria-hidden="true" />
        {likesCount}
      </button>
      {error && <p className="font-sans text-xs text-ash">Не вдалося оновити лайк.</p>}
    </div>
  );
}
