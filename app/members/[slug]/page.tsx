import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ProfileLayout } from "@/components/members/ProfileLayout";
import { MemberHeader } from "@/components/members/MemberHeader";
import { ProfileContent } from "@/components/members/ProfileContent";
import { AwardsSection } from "@/components/members/AwardsSection";
import { AmbientBackground } from "@/components/members/AmbientBackground";
import { ClaimProfileButton } from "@/components/members/ClaimProfileButton";
import { EditProfileButton } from "@/components/members/EditProfileButton";
import { DiscordBadge } from "@/components/members/DiscordBadge";
import { FollowSection } from "@/components/members/FollowSection";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { CommentsSection } from "@/components/members/CommentsSection";
import { getAllMembers, getMemberBySlug } from "@/lib/members";
import { getProfileBySlug, resolveLocationLabel, resolveMemberDisplay } from "@/lib/profiles";
import { getFollowCounts, isFollowing, getUsernameByUserId } from "@/lib/follows";
import { getProjectsByAuthorId } from "@/lib/projects";
import { getProfileComments } from "@/lib/profile-comments";
import { auth } from "@/lib/auth";
import { buildMemberMetadata } from "@/lib/seo";

interface MemberPageProps {
  // Next.js 15: dynamic route params are async.
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ claimError?: string }>;
}

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  taken: "Цей профіль уже хтось заявив.",
  "already-owns": "Ви вже маєте заявлений профіль — один користувач може заявити лише один.",
};

// Static routes still come from data/members.ts (Phase 1's design/awards
// data isn't stored per-request), but this no longer decides who owns or
// can edit a page — see lib/profiles.ts.
export function generateStaticParams() {
  return getAllMembers().map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = getMemberBySlug(slug);
  if (!member) return {};

  const profile = await getProfileBySlug(slug);
  return buildMemberMetadata(resolveMemberDisplay(member, profile));
}

export default async function MemberPage({ params, searchParams }: MemberPageProps) {
  const { slug } = await params;
  const { claimError } = await searchParams;
  const member = getMemberBySlug(slug);

  if (!member) {
    notFound();
  }

  const [profile, session] = await Promise.all([getProfileBySlug(slug), auth()]);
  const displayMember = resolveMemberDisplay(member, profile);
  const location = resolveLocationLabel(profile);

  const isOwner = Boolean(session?.user && profile?.userId === session.user.id);
  const isClaimable = Boolean(session?.user && profile && !profile.userId);
  const claimErrorMessage = claimError ? CLAIM_ERROR_MESSAGES[claimError] : undefined;
  const hasHeaderActions = isOwner || isClaimable || Boolean(claimErrorMessage);

  // Phase 5.1 — Follow System. Only meaningful for a claimed profile: an
  // unclaimed Profile has no linked User (see Profile.userId), and Follow
  // rows are keyed off User.id, not Profile.id — see prisma/schema.prisma's
  // comment on the Follow model for why.
  let followCounts: { followers: number; following: number } | null = null;
  let viewerIsFollowing = false;
  let ownerUsername: string | null = null;
  if (profile?.userId) {
    [followCounts, viewerIsFollowing, ownerUsername] = await Promise.all([
      getFollowCounts(profile.userId),
      session?.user ? isFollowing(session.user.id, profile.userId) : Promise.resolve(false),
      getUsernameByUserId(profile.userId),
    ]);
  }

  // Phase 6.1 — Projects Foundation. Same "claimed profile only" rule as
  // Follow/Discord above: Project.authorId is a User.id, and an
  // unclaimed Profile has none. `includePrivate` is only true for the
  // profile's own owner, so a visitor never sees another member's
  // PRIVATE projects here.
  const projects = profile?.userId
    ? await getProjectsByAuthorId(profile.userId, { includePrivate: isOwner })
    : [];

  // Phase 7.1 — Profile Comments. Same "claimed profile only" rule as
  // Follow/Discord/Projects above — see prisma/schema.prisma's comment
  // on ProfileComment for why an unclaimed Profile has no comments
  // section at all.
  const comments = profile?.userId ? await getProfileComments(profile.userId) : [];

  return (
    <Section className="relative isolate overflow-hidden">
      <AmbientBackground member={displayMember} />
      <Container wide>
        <a
          href="/"
          className="mb-12 inline-block font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-150 hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          ← Індекс
        </a>
        <ProfileLayout
          header={
            <MemberHeader
              member={displayMember}
              location={location}
              // Membership only means anything for a Profile that's
              // actually linked to a Discord account — an unclaimed
              // profile has no Discord identity to be a "member" of,
              // so no badge renders for it at all (not even the gray
              // "not joined" state, which would be misleading here).
              discordBadge={
                profile?.userId ? <DiscordBadge serverMember={profile.serverMember} /> : undefined
              }
              followSection={
                profile?.userId && followCounts && ownerUsername ? (
                  <FollowSection
                    targetUserId={profile.userId}
                    username={ownerUsername}
                    initialIsFollowing={viewerIsFollowing}
                    initialFollowersCount={followCounts.followers}
                    followingCount={followCounts.following}
                    canFollow={Boolean(session?.user) && !isOwner}
                  />
                ) : undefined
              }
              actions={
                hasHeaderActions ? (
                  <>
                    {isOwner && <EditProfileButton />}
                    {!isOwner && isClaimable && <ClaimProfileButton slug={slug} />}
                    {claimErrorMessage && (
                      <p className="w-full font-mono text-xs text-ash">{claimErrorMessage}</p>
                    )}
                  </>
                ) : undefined
              }
            />
          }
          aside={
            member.awards && member.awards.length > 0 ? (
              <AwardsSection awards={member.awards} />
            ) : undefined
          }
        >
          <ProfileContent member={displayMember} />
        </ProfileLayout>

        {/* Projects and Comments break out of ProfileLayout's max-w-[60ch]
           reading column on purpose — with the profile's bio/socials
           capped for legibility, these two get the full wide Container
           instead, side by side on desktop: Projects takes the larger
           share since project cards need the room, Comments sits in a
           narrower fixed-width column next to it. Both collapse to a
           single stacked column below lg. */}
        {profile?.userId && (
          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px] lg:gap-10">
            <ProjectsSection projects={projects} isOwner={isOwner} />
            {ownerUsername && (
              <CommentsSection
                endpoint={`/api/users/${ownerUsername}/profile-comments`}
                deleteBasePath="/api/profile-comments"
                ownerId={profile.userId}
                initialComments={comments}
                viewer={session?.user ? { id: session.user.id } : null}
              />
            )}
          </div>
        )}
      </Container>
    </Section>
  );
}
