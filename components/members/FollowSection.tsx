"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FollowListModal } from "@/components/members/FollowListModal";

interface FollowSectionProps {
  /** The User.id being followed (the profile owner) — see the schema
   * comment on `Follow` for why this is a User.id, not a Profile.id. */
  targetUserId: string;
  /** The same user's username — needed to build the Phase 5.2 list
   * endpoints (`/api/users/[username]/followers|following`), which are
   * keyed by username rather than id per that phase's brief. */
  username: string;
  initialIsFollowing: boolean;
  initialFollowersCount: number;
  /** How many people the *viewed* profile's owner follows. Static: unlike
   * followers, nothing this component does can change it, so it's plain
   * display, not state. */
  followingCount: number;
  /** Whether to render the button at all — false when signed out or when
   * viewing your own profile (see app/members/[slug]/page.tsx). Signed-out
   * visitors and the profile owner still see the counts, just no button. */
  canFollow: boolean;
}

// Phase 5.1 — Follow System. Phase 5.2 added the two list modals below
// the counts became clickable.
//
// One client component covering the counts and the Follow/Following
// button, rather than two separate ones: the count that actually changes
// here (followers) and the button that changes it are tightly coupled
// state, and keeping them in one component avoids reaching for a shared
// parent, context, or a custom event just to keep two siblings in sync
// over one number.
//
// The Follow/Unfollow button talks to app/api/follow/route.ts — the
// Route Handlers Phase 5.1's brief specifically asked for, unlike Phase
// 3/4's Server-Action write paths (actions/profile.ts,
// actions/discord.ts). The list modals below talk to the separate,
// read-only `/api/users/[username]/...` Route Handlers Phase 5.2 added.
// Everything else in the app keeps using Server Actions; these are the
// only two features that need to update in place without a page
// navigation.
export function FollowSection({
  targetUserId,
  username,
  initialIsFollowing,
  initialFollowersCount,
  followingCount,
  canFollow,
}: FollowSectionProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);
  // Which list modal (if any) is open. A single piece of state rather
  // than two booleans, since at most one of the two can be open at once.
  const [openList, setOpenList] = useState<"followers" | "following" | null>(null);

  async function toggleFollow() {
    if (isPending) return;

    const nextIsFollowing = !isFollowing;
    setError(false);
    setIsPending(true);
    // Optimistic: update both the button label and the count immediately;
    // only revert if the request actually fails below.
    setIsFollowing(nextIsFollowing);
    setFollowersCount((count) => count + (nextIsFollowing ? 1 : -1));

    try {
      const response = await fetch("/api/follow", {
        method: nextIsFollowing ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!response.ok) {
        throw new Error(`Follow request failed: ${response.status}`);
      }
      const data: { following: boolean; followersCount: number } = await response.json();
      // Trust the server's numbers over the optimistic guess, in case
      // another request changed things in between.
      setIsFollowing(data.following);
      setFollowersCount(data.followersCount);
    } catch (err) {
      console.error("[follow] request failed, reverting:", err);
      setIsFollowing(!nextIsFollowing);
      setFollowersCount((count) => count + (nextIsFollowing ? -1 : 1));
      setError(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="font-sans text-xs uppercase tracking-wider text-ash">
        <button
          type="button"
          onClick={() => setOpenList("followers")}
          className="text-ash underline decoration-transparent underline-offset-4 transition-colors duration-fast hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          <span className="text-bone">{followersCount}</span> Followers
        </button>
        {" · "}
        <button
          type="button"
          onClick={() => setOpenList("following")}
          className="text-ash underline decoration-transparent underline-offset-4 transition-colors duration-fast hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          <span className="text-bone">{followingCount}</span> Following
        </button>
      </p>

      {canFollow && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={toggleFollow}
            disabled={isPending}
            aria-pressed={isFollowing}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-4 py-2 font-sans text-xs uppercase tracking-wider transition-colors duration-fast focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60",
              isFollowing
                ? "border-brass text-brass hover:border-line hover:text-bone"
                : "border-line text-bone hover:border-brass hover:text-brass"
            )}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
          {error && <p className="font-sans text-xs text-ash">Не вдалося оновити підписку.</p>}
        </div>
      )}

      <FollowListModal
        isOpen={openList === "followers"}
        onClose={() => setOpenList(null)}
        title="Followers"
        endpoint={`/api/users/${username}/followers`}
        emptyMessage="No followers yet."
      />
      <FollowListModal
        isOpen={openList === "following"}
        onClose={() => setOpenList(null)}
        title="Following"
        endpoint={`/api/users/${username}/following`}
        emptyMessage="This user isn't following anyone yet."
      />
    </div>
  );
}
