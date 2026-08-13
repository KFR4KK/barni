import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/posts/PostCard";
import { PostComposer } from "@/components/posts/PostComposer";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { PopularAccountsCard } from "@/components/feed/PopularAccountsCard";
import { PopularTagsCard } from "@/components/feed/PopularTagsCard";
import { getFeed, type FeedItem } from "@/lib/feed";
import { getPostComments } from "@/lib/post-comments";
import type { PostCommentWithAuthor } from "@/lib/post-comments";
import { auth } from "@/lib/auth";
import { getPopularAccounts } from "@/lib/popular-accounts";
import { getPopularTags } from "@/lib/tags";

export const metadata: Metadata = {
  title: "Feed",
};

function isPostItem(item: FeedItem): item is Extract<FeedItem, { type: "post" }> {
  return item.type === "post";
}

export default async function FeedPage() {
  const [items, session, popularAccounts, popularTags] = await Promise.all([
    getFeed(),
    auth(),
    getPopularAccounts(),
    getPopularTags(),
  ]);
  const isSignedIn = Boolean(session?.user);
  const viewer = session?.user ? { id: session.user.id } : null;

  const postItems = items.filter(isPostItem);
  const commentsByPostId = new Map<string, PostCommentWithAuthor[]>(
    await Promise.all(
      postItems.map(async (item) => [item.post.id, await getPostComments(item.post.id)] as const)
    )
  );

  const viewerAvatarUrl = session?.user?.avatarUrl ?? null;
  const viewerDisplayName = session?.user?.displayName ?? session?.user?.username ?? "";

  return (
    <Section className="py-12 md:py-16 lg:py-20">
      <Container feedWide>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)_minmax(260px,300px)] lg:gap-8">
          {/* Left sidebar — hidden on mobile, sticky on desktop */}
          <aside className="order-2 hidden md:block lg:sticky lg:top-24 lg:order-none lg:col-start-1 lg:row-start-1 lg:self-start">
            <PopularAccountsCard accounts={popularAccounts} />
          </aside>

          {/* Center column — always visible */}
          <div className="order-1 md:col-span-2 lg:order-none lg:col-span-1 lg:col-start-2 lg:row-start-1">
            {isSignedIn && (
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-stretch">
                <PostComposer
                  avatarUrl={viewerAvatarUrl}
                  displayName={viewerDisplayName}
                  variant="feed"
                  className="min-w-0 flex-1"
                />
                <Button
                  href="/projects/new"
                  variant="outline"
                  className="shrink-0 self-stretch whitespace-nowrap rounded-[20px] px-6 py-3 font-sans text-xs uppercase tracking-wider sm:min-w-[180px] sm:justify-center"
                >
                  Створити проєкт
                </Button>
              </div>
            )}

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span className="text-5xl" aria-hidden="true">
                  📭
                </span>
                <p className="font-sans text-base text-bone">Поки що тут тихо</p>
                <p className="max-w-[42ch] font-sans text-sm text-ash">
                  Коли учасники почнуть публікувати свої проєкти та дописи, вони з&apos;являться
                  тут.
                </p>
                {isSignedIn && (
                  <div className="mt-2">
                    <Button
                      href="/projects/new"
                      variant="outline"
                      className="rounded-[20px] px-6 py-3 font-sans text-xs uppercase tracking-wider"
                    >
                      Створити проєкт
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {items.map((item) =>
                  item.type === "post" ? (
                    <PostCard
                      key={`post-${item.post.id}`}
                      post={item.post}
                      comments={commentsByPostId.get(item.post.id) ?? []}
                      viewer={viewer}
                      variant="feed"
                    />
                  ) : (
                    <ProjectCard
                      key={`project-${item.project.id}`}
                      project={item.project}
                      variant="feed"
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* Right sidebar — hidden on mobile, sticky on desktop */}
          <aside className="order-3 hidden md:block lg:sticky lg:top-24 lg:order-none lg:col-start-3 lg:row-start-1 lg:self-start">
            <PopularTagsCard tags={popularTags} />
          </aside>
        </div>
      </Container>
    </Section>
  );
}
