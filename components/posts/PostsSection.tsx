import { PostCard } from "@/components/posts/PostCard";
import { PostComposer } from "@/components/posts/PostComposer";
import type { PostWithAuthor } from "@/lib/posts";
import type { PostCommentWithAuthor } from "@/lib/post-comments";

// Phase 8.1 — Post Comments. Each post carries its own already-fetched
// comment thread — see app/members/[slug]/page.tsx, which calls
// lib/post-comments.ts's getPostComments once per post alongside
// lib/posts.ts's getPostsByUserId, the same "server page composes
// multiple lib modules, no single fetch does everything" split that page
// already uses for Follows/Projects/Comments.
export type PostWithComments = PostWithAuthor & { comments: PostCommentWithAuthor[] };

interface PostsSectionProps {
  posts: PostWithComments[];
  /** Whether the signed-in visitor owns this profile — controls whether
   * the inline PostComposer renders at all, same role as
   * ProjectsSection's `isOwner`. */
  isOwner: boolean;
  /** Passed straight through to each PostCard's CommentsSection — null
   * when signed out, hides every post's composer/reply/delete controls. */
  viewer: { id: string } | null;
  /**
   * Phase 9.4 — Inline Post Composer. The owner's own avatar/name, shown
   * by PostComposer — only meaningful (and only ever passed) alongside
   * `isOwner`. Resolved by the caller (app/members/[slug]/page.tsx) from
   * its own `session`, the same source app/feed/page.tsx already reads
   * for the identical composer there.
   */
  viewerAvatarUrl?: string | null;
  viewerDisplayName?: string;
  /** Phase 12, point 7 — Projects/Posts Switch. See ProjectsSection's
   * identically-named prop for the full reasoning. */
  showHeading?: boolean;
}

// Phase 8.0 — Posts Foundation. A standalone section below
// ProjectsSection (app/members/[slug]/page.tsx), not merged into it or
// into a shared "Content" section — per the brief: Posts and Projects
// stay independent, each with its own heading and empty state, the same
// way ProjectsSection itself sits beside CommentsSection rather than
// inside ProfileContent.
export function PostsSection({
  posts,
  isOwner,
  viewer,
  viewerAvatarUrl = null,
  viewerDisplayName = "",
  showHeading = true,
}: PostsSectionProps) {
  return (
    <section aria-labelledby="profile-posts-heading">
      {showHeading && (
        <h2 id="profile-posts-heading" className="font-sans text-xs uppercase tracking-[0.2em] text-ash">
          Posts
        </h2>
      )}

      {/* Phase 9.4 — Inline Post Composer. Replaces the old "Новий пост"
         link to /posts/new — same component, same submit path, as the
         one Feed renders (see app/feed/page.tsx), just placed here
         instead of at the top of the global feed. */}
      {isOwner && (
        <div className="mt-5">
          <PostComposer avatarUrl={viewerAvatarUrl} displayName={viewerDisplayName} />
        </div>
      )}

      {posts.length === 0 ? (
        <p className="mt-5 font-sans text-sm text-ash">
          {isOwner ? "У вас ще немає жодного поста." : "Тут поки що немає жодного поста."}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} comments={post.comments} viewer={viewer} />
          ))}
        </div>
      )}
    </section>
  );
}
