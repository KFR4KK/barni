import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ProfileHeader } from "@/components/members/ProfileHeader";
import { EditProfileButton } from "@/components/members/EditProfileButton";
import { FollowSection } from "@/components/members/FollowSection";
import { ProfileProjectsPostsSwitcher } from "@/components/members/ProfileProjectsPostsSwitcher";
import { ProfileMusicPlayer } from "@/components/members/ProfileMusicPlayer";
import { CommentsSection } from "@/components/members/CommentsSection";
import { getAllMembers, getMemberBySlug } from "@/lib/members";
import {
  getProfileByUsername,
  resolveLocationLabel,
  resolveMemberDisplay,
  buildMemberFromProfile,
} from "@/lib/profiles";
import { getFollowCounts, isFollowing } from "@/lib/follows";
import { getProjectsByAuthorId } from "@/lib/projects";
import { getPostsByUserId } from "@/lib/posts";
import { getPostComments } from "@/lib/post-comments";
import { getProfileComments } from "@/lib/profile-comments";
import { auth } from "@/lib/auth";
import { buildMemberMetadata } from "@/lib/seo";

interface MemberPageProps {
  // Next.js 15: dynamic route params are async. Kept named `slug` at the
  // route-segment level even though a real account's page is now keyed
  // by User.username, not Profile.slug (removed — see
  // prisma/schema.prisma) — this still also has to match a curated,
  // hand-authored data/members.ts entry's own `slug` field, which is
  // unrelated to any account and unaffected by that change.
  params: Promise<{ slug: string }>;
}

// Static routes still come from data/members.ts (Phase 1's design/awards
// data isn't stored per-request), but this no longer decides who owns or
// can edit a page — see lib/profiles.ts.
//
// Phase 9.5 — Profile Auto-Provisioning. Still only pre-renders the
// curated, hand-authored slugs — every real Profile (i.e. every sign-up
// going forward) renders on demand instead, the same way any other
// dynamic route not listed here already does (no `dynamicParams = false`
// is set anywhere in this file).
export function generateStaticParams() {
  return getAllMembers().map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { slug: username } = await params;
  const member = getMemberBySlug(username);
  const profile = await getProfileByUsername(username);
  if (!member && !profile) return {};

  const displayMember = member ? resolveMemberDisplay(member, profile) : buildMemberFromProfile(profile!);
  return buildMemberMetadata(displayMember);
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { slug: username } = await params;
  const member = getMemberBySlug(username);

  const [profile, session] = await Promise.all([getProfileByUsername(username), auth()]);

  // A page now exists for this route param if EITHER the curated static
  // data or a real Profile has it — this is what makes
  // /members/{someone's-chosen-username} work for a brand-new sign-up
  // with no data/members.ts entry at all. Only a value matching neither
  // is a real 404.
  if (!member && !profile) {
    notFound();
  }

  const displayMember = member ? resolveMemberDisplay(member, profile) : buildMemberFromProfile(profile!);
  const location = resolveLocationLabel(profile);

  const isOwner = Boolean(session?.user && profile?.userId === session.user.id);

  // Account Linking — `profile.username` (from getProfileByUsername
  // above) already IS this profile owner's username, since that's what
  // we just looked the Profile up by; no second query needed the way the
  // old getUsernameByUserId(profile.userId) call here used to require.
  const ownerUsername = profile?.username ?? null;

  // Phase 5.1 — Follow System. Only meaningful for a claimed profile: an
  // unclaimed Profile has no linked User (see Profile.userId), and Follow
  // rows are keyed off User.id, not Profile.id — see prisma/schema.prisma's
  // comment on the Follow model for why.
  let followCounts: { followers: number; following: number } | null = null;
  let viewerIsFollowing = false;
  if (profile?.userId) {
    [followCounts, viewerIsFollowing] = await Promise.all([
      getFollowCounts(profile.userId),
      session?.user ? isFollowing(session.user.id, profile.userId) : Promise.resolve(false),
    ]);
  }

  // Phase 6.1 — Projects Foundation. Same "claimed profile only" rule as
  // Follow above: Project.authorId is a User.id, and an unclaimed Profile
  // has none. `includePrivate` is only true for the profile's own owner,
  // so a visitor never sees another member's PRIVATE projects here.
  const projects = profile?.userId
    ? await getProjectsByAuthorId(profile.userId, { includePrivate: isOwner })
    : [];

  // Phase 8.0 — Posts Foundation. Same "claimed profile only" rule as
  // Projects above — Post.userId is a User.id, and an unclaimed Profile
  // has none.
  const posts = profile?.userId ? await getPostsByUserId(profile.userId) : [];

  // Phase 8.1 — Post Comments. One getPostComments call per post, run
  // together rather than sequentially — same "compose in the page, not
  // in a single do-everything fetch" split this page already uses for
  // Follows/Projects/Comments above. A post has no dedicated page of its
  // own to fetch this on demand from (see lib/posts.ts's own comment), so
  // the profile page — the only place Posts render — is where the
  // thread has to be loaded.
  const postsWithComments = await Promise.all(
    posts.map(async (post) => ({ ...post, comments: await getPostComments(post.id) }))
  );

  // Phase 7.1 — Profile Comments. Same "claimed profile only" rule as
  // Follow/Projects above — see prisma/schema.prisma's comment on
  // ProfileComment for why an unclaimed Profile has no comments section
  // at all. Phase 12, point 11 — the viewer's own id unlocks each
  // comment's `viewerHasLiked`.
  const comments = profile?.userId
    ? await getProfileComments(profile.userId, session?.user?.id ?? null)
    : [];

  return (
    <Section compact className="relative isolate overflow-hidden !pt-0">
      <Container feedWide>
        <div className="relative">
          <Link
            href="/"
            className="absolute left-6 top-6 z-10 inline-block rounded-full bg-graphite/60 px-3 py-1.5 font-sans text-xs uppercase tracking-wider text-bone backdrop-blur-sm transition-colors duration-150 hover:bg-graphite/80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
          >
            ← Індекс
          </Link>

          <ProfileHeader
            member={displayMember}
            profile={profile}
            location={location}
            musicPlayer={
              profile?.musicUrl && profile.musicTitle ? (
                <ProfileMusicPlayer url={profile.musicUrl} title={profile.musicTitle} artist={profile.musicArtist} />
              ) : undefined
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
            actions={isOwner ? <EditProfileButton /> : undefined}
          />
        </div>

        {/* Правки 3 — the sidebar widgets column was removed entirely,
           so this is now one full-width main column: projects/posts
           switcher, then comments. */}
        {profile?.userId && (
          <div className="mx-auto mt-14 flex max-w-[1180px] flex-col gap-14">
            {/* Phase 12, points 7/8 — Projects/Posts Switch + Local
               Project Filters. */}
            <ProfileProjectsPostsSwitcher
              projects={projects}
              posts={postsWithComments}
              isOwner={isOwner}
              viewer={session?.user ? { id: session.user.id } : null}
              viewerAvatarUrl={session?.user?.avatarUrl ?? null}
              viewerDisplayName={session?.user?.displayName ?? session?.user?.username ?? ""}
            />

            {ownerUsername && (
              <CommentsSection
                endpoint={`/api/users/${ownerUsername}/profile-comments`}
                deleteBasePath="/api/profile-comments"
                ownerId={profile.userId}
                initialComments={comments}
                viewer={session?.user ? { id: session.user.id } : null}
                likesEnabled
              />
            )}
          </div>
        )}
      </Container>
    </Section>
  );
}
