import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PostCard } from "@/components/posts/PostCard";
import { PostComposer } from "@/components/posts/PostComposer";
import { PopularAccountsCard } from "@/components/feed/PopularAccountsCard";
import { ViewerCard } from "@/components/feed/ViewerCard";
import { NewMembersCard } from "@/components/feed/NewMembersCard";
import { CommunityActivityCard } from "@/components/feed/CommunityActivityCard";
import { getAllPosts } from "@/lib/posts";
import { getPostComments } from "@/lib/post-comments";
import type { PostCommentWithAuthor } from "@/lib/post-comments";
import { auth } from "@/lib/auth";
import { getPopularAccounts } from "@/lib/popular-accounts";
import { getNewMembers, getCommunityActivityToday } from "@/lib/community-stats";
import { getFollowCounts } from "@/lib/follows";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Feed",
};

// Feed Redesign (X/Threads-inspired). Feed is posts-only now — Projects
// moved to their own dedicated page (see app/projects/page.tsx and
// components/projects/gallery/*); lib/feed.ts's Post+Project merge is no
// longer used here (still there, unreferenced, in case a later phase
// wants a combined view again — nothing about removing it from *this*
// page requires deleting it).
export default async function FeedPage() {
  const session = await auth();
  const viewer = session?.user ? { id: session.user.id } : null;

  const [posts, popularAccounts, newMembers, activity] = await Promise.all([
    getAllPosts(viewer?.id ?? null),
    getPopularAccounts(),
    getNewMembers(),
    getCommunityActivityToday(),
  ]);

  const commentsByPostId = new Map<string, PostCommentWithAuthor[]>(
    await Promise.all(posts.map(async (post) => [post.id, await getPostComments(post.id)] as const))
  );

  const isSignedIn = Boolean(session?.user);
  const viewerAvatarUrl = session?.user?.avatarUrl ?? null;
  const viewerDisplayName = session?.user?.displayName ?? session?.user?.username ?? "";

  // Own stats for ViewerCard — only fetched when signed in, and only
  // this one extra pair of counts (not a second getPostsByUserId call)
  // since the card only needs the number, not the posts themselves.
  let viewerStats: { followers: number; posts: number } | null = null;
  if (session?.user) {
    const [followCounts, postsCount] = await Promise.all([
      getFollowCounts(session.user.id),
      prisma.post.count({ where: { userId: session.user.id } }),
    ]);
    viewerStats = { followers: followCounts.followers, posts: postsCount };
  }

  return (
    <Section className="relative isolate overflow-hidden py-12 md:py-16 lg:py-20">
      {/* A colored blur glow at the top of the page — same radial-glow
         technique components/landing/LandingHero.tsx already uses,
         reused here instead of a second implementation. Built from the
         app's one existing accent (brass) rather than introducing a new
         color, per this design system's "one accent, no random colors"
         rule — the provided mockup's glow was blue; this keeps the same
         "colorful glow at the top" feeling in .vibe's own palette. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brass/10 blur-[130px]"
      />

      <Container feedWide>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(260px,300px)] lg:gap-10">
          {/* Left sidebar — hidden on mobile, sticky on desktop */}
          <aside className="order-2 hidden flex-col gap-6 md:flex lg:sticky lg:top-24 lg:order-none lg:col-start-1 lg:row-start-1 lg:self-start">
            {session?.user && viewerStats && session.user.username && (
              <ViewerCard
                username={session.user.username}
                displayName={viewerDisplayName}
                avatarUrl={viewerAvatarUrl}
                followersCount={viewerStats.followers}
                postsCount={viewerStats.posts}
              />
            )}
            <PopularAccountsCard accounts={popularAccounts} />
          </aside>

          {/* Center column — always visible */}
          <div className="order-1 flex flex-col gap-8 md:col-span-2 lg:order-none lg:col-span-1 lg:col-start-2 lg:row-start-1">
            {isSignedIn && (
              <PostComposer
                avatarUrl={viewerAvatarUrl}
                displayName={viewerDisplayName}
                variant="feed"
              />
            )}

            {posts.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span className="text-5xl" aria-hidden="true">
                  📭
                </span>
                <p className="font-sans text-base text-bone">Поки що тут тихо</p>
                <p className="max-w-[42ch] font-sans text-sm text-ash">
                  Коли учасники почнуть публікувати дописи, вони з&apos;являться тут.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    comments={commentsByPostId.get(post.id) ?? []}
                    viewer={viewer}
                    variant="feed"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar — hidden on mobile, sticky on desktop */}
          <aside className="order-3 hidden flex-col gap-6 md:flex lg:sticky lg:top-24 lg:order-none lg:col-start-3 lg:row-start-1 lg:self-start">
            <NewMembersCard members={newMembers} />
            <CommunityActivityCard activity={activity} />
          </aside>
        </div>
      </Container>
    </Section>
  );
}
