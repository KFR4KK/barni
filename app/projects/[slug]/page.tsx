import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Globe, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { ProjectVisibilityBadge } from "@/components/projects/ProjectVisibilityBadge";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { ProjectAuthorCard } from "@/components/projects/ProjectAuthorCard";
import { ProjectTagsCard } from "@/components/projects/ProjectTagsCard";
import { CommentsSection } from "@/components/members/CommentsSection";
import { LikeButton } from "@/components/projects/LikeButton";
import { auth } from "@/lib/auth";
import { getProjectWithAuthor, incrementProjectViewCount } from "@/lib/projects";
import { getProfileByUserId } from "@/lib/profiles";
import { getProjectComments } from "@/lib/project-comments";
import { getLikesCount, hasUserLiked } from "@/lib/project-likes";
import { getProjectTags } from "@/lib/tags";
import { splitIntoParagraphs } from "@/lib/utils";
import { siteConfig } from "@/data/site";
import type { Socials } from "@/data/types";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectWithAuthor(slug);
  if (!project) return {};

  return {
    title: `${project.title} — ${siteConfig.name}`,
    description: project.shortDescription || project.description.slice(0, 160),
  };
}

// Phase 6.1 — Projects Foundation. Cover image, title, author byline,
// description, created date, gallery. Phase 8.1 added a Comments block
// below the gallery (see CommentsSection near the bottom of this file).
// Phase 7.3 adds the like button next to the title (see LikeButton) —
// still no view stats.
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectWithAuthor(slug);

  if (!project) {
    notFound();
  }

  const session = await auth();
  const isOwner = Boolean(session?.user && session.user.id === project.authorId);

  // PRIVATE has no dedicated audience list yet (that's a later phase) —
  // for now it just means "only the author can view this page". Without
  // this check, the visibility field this phase introduces wouldn't
  // actually do anything.
  if (project.visibility === "PRIVATE" && !isOwner) {
    notFound();
  }

  // Projects Gallery redesign — view count. Skips the owner's own visits
  // (checking your own project shouldn't inflate its stats) and runs via
  // `after()`, not a bare unawaited promise: on a serverless platform
  // like Vercel the function can freeze right after the response is
  // sent, which would silently drop a fire-and-forget write that hadn't
  // finished yet — `after()` is Next's actual guarantee for "run this,
  // but don't make the response wait for it".
  if (!isOwner) {
    after(() => incrementProjectViewCount(project.id));
  }

  // Phase 8.1 — Project Comments. Same "claimed-nothing-required" shape
  // as Profile Comments (app/members/[slug]/page.tsx): a Project always
  // has an authorId (unlike an unclaimed Profile's optional userId), so
  // there's no equivalent gate here — every project page gets a Comments
  // block.
  const comments = await getProjectComments(project.id);

  // Phase 7.3 — Project Likes. Count is always public (rendered even for
  // signed-out visitors); whether the current viewer has liked it only
  // matters — and is only fetched — when someone is actually signed in.
  const [likesCount, isLiked] = await Promise.all([
    getLikesCount(project.id),
    session?.user ? hasUserLiked(project.id, session.user.id) : Promise.resolve(false),
  ]);

  // Prefers the author's claimed Profile display name when one exists,
  // same fallback-to-bare-username pattern lib/follows.ts's
  // FollowListEntry already uses. The link itself is always the
  // author's username — already on hand from getProjectWithAuthor's own
  // join, no second Profile lookup needed for it now that Profile has
  // no `slug` of its own (see prisma/schema.prisma).
  const authorProfile = await getProfileByUserId(project.authorId);
  const authorName =
    authorProfile?.displayName || project.author.displayName || project.author.username || "Учасник";
  const authorHref = project.author.username ? `/members/${project.author.username}` : null;
  const authorAvatarUrl = authorProfile?.avatar || project.author.avatarUrl || null;
  const authorBio = authorProfile?.bio ?? "";
  const authorSocials = (authorProfile?.socials ?? undefined) as Socials | undefined;
  // Every real (non-seed) Profile is created at Discord sign-in — see
  // lib/profiles.ts's own comment on createProfileForUser — so a Profile
  // actually attached to a User (userId set) is exactly "this author
  // signed in with Discord", the same condition components/members'
  // DiscordBadge is built around.
  const isDiscordMember = Boolean(authorProfile?.userId);

  // Phase 10 — Tags. Fetched alongside comments/likes below; this is the
  // right column's tag list.
  const tags = await getProjectTags(project.id);

  return (
    <Section>
      <Container feedWide>
        <Link
          href="/feed"
          className="mb-8 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:text-bone"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Назад
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,300px)] lg:gap-8">
          <ProjectAuthorCard
            className="lg:col-start-1 lg:row-start-1 lg:self-start"
            authorName={authorName}
            authorUsername={project.author.username}
            authorHref={authorHref}
            avatarUrl={authorAvatarUrl}
            isDiscordMember={isDiscordMember}
            bio={authorBio}
            socials={authorSocials}
            memberSince={project.author.createdAt}
            postedAt={project.createdAt}
          />

          <div className="lg:col-start-2 lg:row-start-1">
            <ProjectGallery
              coverImage={project.coverImage}
              images={project.images}
              title={project.title}
              className="mb-10"
            />

            <div className="flex flex-wrap items-center gap-3">
              <ProjectVisibilityBadge visibility={project.visibility} />
              {isOwner && (
                <Button href={`/projects/${project.slug}/edit`} variant="outline">
                  Редагувати проєкт
                </Button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <h1 className="font-serif text-4xl text-bone md:text-5xl">{project.title}</h1>
              <LikeButton
                slug={project.slug}
                initialLiked={isLiked}
                initialLikesCount={likesCount}
                canLike={Boolean(session?.user)}
              />
            </div>

            {project.shortDescription && (
              <p className="mt-3 max-w-[60ch] font-sans text-lg leading-relaxed text-ash">
                {project.shortDescription}
              </p>
            )}

            {/* Phase 6.2 — External links. GitHub moved to the tags card
                (right column) per the Phase 10 brief; the site/demo link
                stays here since that card only ever mentions GitHub. */}
            {project.externalUrl && (
              <div className="mt-5">
                <a
                  href={project.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-sans text-sm tracking-wide text-bone transition-colors duration-150 hover:border-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  Visit Website
                </a>
              </div>
            )}

            <div className="mt-8 flex max-w-[60ch] flex-col gap-4">
              {splitIntoParagraphs(project.description).map((paragraph, index) => (
                <p key={index} className="font-sans text-base leading-[1.75] text-bone/90">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-14 max-w-[60ch]">
              <CommentsSection
                endpoint={`/api/projects/${project.slug}/comments`}
                deleteBasePath="/api/project-comments"
                ownerId={project.authorId}
                ownerLabel="Project Owner"
                initialComments={comments}
                viewer={session?.user ? { id: session.user.id } : null}
              />
            </div>
          </div>

          <ProjectTagsCard
            className="lg:col-start-3 lg:row-start-1 lg:self-start"
            tags={tags}
            githubUrl={project.githubUrl}
            publishedAt={project.createdAt}
          />
        </div>
      </Container>
    </Section>
  );
}
