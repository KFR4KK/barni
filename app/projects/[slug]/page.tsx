import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Github, Globe } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { ProjectVisibilityBadge } from "@/components/projects/ProjectVisibilityBadge";
import { ProjectGallery } from "@/components/projects/ProjectGallery";
import { CommentsSection } from "@/components/members/CommentsSection";
import { LikeButton } from "@/components/projects/LikeButton";
import { auth } from "@/lib/auth";
import { getProjectWithAuthor } from "@/lib/projects";
import { getProfileByUserId } from "@/lib/profiles";
import { getProjectComments } from "@/lib/project-comments";
import { getLikesCount, hasUserLiked } from "@/lib/project-likes";
import { formatDate, isExternalUrl, splitIntoParagraphs } from "@/lib/utils";
import { siteConfig } from "@/data/site";

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

  // Prefers the author's claimed Profile (display name + link to
  // `/members/[slug]`) when one exists, same fallback-to-bare-username
  // pattern lib/follows.ts's FollowListEntry already uses — an author
  // who hasn't claimed a Profile still gets a byline, just not a link.
  const authorProfile = await getProfileByUserId(project.authorId);
  const authorName = authorProfile?.displayName || project.author.displayName || project.author.username;
  const authorHref = authorProfile ? `/members/${authorProfile.slug}` : null;

  return (
    <Section>
      <Container>
        {project.coverImage && (
          <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-card">
            <Image
              src={project.coverImage}
              alt=""
              fill
              sizes="(min-width: 768px) 760px, 100vw"
              className="object-cover"
              unoptimized={isExternalUrl(project.coverImage)}
              priority
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-ash">
            {authorHref ? (
              <Link
                href={authorHref}
                className="text-ash underline decoration-transparent underline-offset-4 transition-colors duration-fast hover:text-bone hover:decoration-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
              >
                {authorName}
              </Link>
            ) : (
              authorName
            )}
            {" · "}
            {formatDate(project.createdAt.toISOString())}
          </p>
          <ProjectVisibilityBadge visibility={project.visibility} />
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

        {/* Phase 6.2 — External links. Only rendered when the author set
            them; an author who left both blank sees no empty button
            row, per the brief ("если ссылки отсутствуют — не отображать
            пустые элементы интерфейса"). */}
        {(project.githubUrl || project.externalUrl) && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-sm tracking-wide text-bone transition-colors duration-150 hover:border-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
            )}
            {project.externalUrl && (
              <a
                href={project.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-sm tracking-wide text-bone transition-colors duration-150 hover:border-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                Visit Website
              </a>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-4">
            <Button href={`/projects/${project.slug}/edit`} variant="outline">
              Редагувати проєкт
            </Button>
          </div>
        )}

        <div className="mt-8 flex max-w-[60ch] flex-col gap-4">
          {splitIntoParagraphs(project.description).map((paragraph, index) => (
            <p key={index} className="font-sans text-base leading-[1.75] text-bone/90">
              {paragraph}
            </p>
          ))}
        </div>

        <ProjectGallery images={project.images} />

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
      </Container>
    </Section>
  );
}
