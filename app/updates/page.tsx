import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PostCard } from "@/components/posts/PostCard";
import { PostComposer } from "@/components/posts/PostComposer";
import { UpdatesInfoCard } from "@/components/updates/UpdatesInfoCard";
import { getUpdatePosts } from "@/lib/posts";
import { getPostComments } from "@/lib/post-comments";
import type { PostCommentWithAuthor } from "@/lib/post-comments";
import { auth } from "@/lib/auth";
import { isAdminUsername } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Updates",
};

// Updates page (Dev Blog / Changelog) — official platform news, not a
// user feed. Reuses PostCard/PostComposer exactly as the redesigned
// Feed does (see app/feed/page.tsx) — same cards, same spacing, same
// animations, per the brief's "должна ощущаться частью одной
// экосистемы". The only thing genuinely new here is the left info card
// (components/updates/UpdatesInfoCard.tsx) and the admin gate on the
// composer below.
export default async function UpdatesPage() {
  const session = await auth();
  const viewer = session?.user ? { id: session.user.id } : null;
  const isAdmin = isAdminUsername(session?.user?.username);

  const posts = await getUpdatePosts(viewer?.id ?? null);
  const commentsByPostId = new Map<string, PostCommentWithAuthor[]>(
    await Promise.all(posts.map(async (post) => [post.id, await getPostComments(post.id)] as const))
  );

  const viewerAvatarUrl = session?.user?.avatarUrl ?? null;
  const viewerDisplayName = session?.user?.displayName ?? session?.user?.username ?? "";

  return (
    <Section className="py-12 md:py-16 lg:py-20">
      <Container feedWide>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-10">
          {/* Left — fully static, stays put while only the right column
             scrolls (per the brief: "должна быть полностью статичной"). */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <UpdatesInfoCard />
          </aside>

          {/* Right — the actual update feed. Only an admin ever sees the
             composer; everyone else's view is read-(+like/comment)-only. */}
          <div className="flex flex-col gap-6">
            {isAdmin && (
              <PostComposer
                avatarUrl={viewerAvatarUrl}
                displayName={viewerDisplayName}
                variant="feed"
                postAsUpdate
              />
            )}

            {posts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-5xl" aria-hidden="true">
                  🛠️
                </span>
                <p className="font-sans text-base text-bone">Оновлень поки що немає</p>
                <p className="max-w-[42ch] font-sans text-sm text-ash">
                  Тут з&apos;являтимуться новини про розвиток .vibe — нові функції, виправлення, плани.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  comments={commentsByPostId.get(post.id) ?? []}
                  viewer={viewer}
                  variant="feed"
                  allowReport={false}
                />
              ))
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
