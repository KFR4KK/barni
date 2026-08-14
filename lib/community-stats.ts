import { prisma } from "@/lib/db";

// Feed Redesign — the right column's two "make the platform feel alive"
// widgets (see components/feed/NewMembersCard.tsx and
// CommunityActivityCard.tsx). Kept in their own file rather than
// lib/popular-accounts.ts/lib/posts.ts: this is Feed-page-specific
// aggregate data, not a general-purpose query either of those modules'
// other callers would reach for.

export interface NewMember {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

// Most recently joined users who've actually finished onboarding
// (username set — see lib/username.ts) — a brand-new User mid-onboarding
// isn't a "member" to show off yet.
export async function getNewMembers(limit = 5): Promise<NewMember[]> {
  const users = await prisma.user.findMany({
    where: { username: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { username: true, displayName: true, avatarUrl: true, profile: { select: { displayName: true, avatar: true } } },
  });

  return users.map((user) => ({
    username: user.username as string,
    displayName: user.profile?.displayName || user.displayName || (user.username as string),
    avatarUrl: user.profile?.avatar || user.avatarUrl,
  }));
}

export interface CommunityActivityToday {
  newPosts: number;
  newComments: number;
  newMembers: number;
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

// Simple same-day counts across the three comment tables (Profile/
// Project/Post) plus new posts and new members — deliberately just
// counts, no scoring/weighting, for a single "here's today" glance
// widget rather than an analytics dashboard.
export async function getCommunityActivityToday(): Promise<CommunityActivityToday> {
  const since = startOfToday();

  const [newPosts, profileComments, projectComments, postComments, newMembers] = await Promise.all([
    prisma.post.count({ where: { createdAt: { gte: since } } }),
    prisma.profileComment.count({ where: { createdAt: { gte: since } } }),
    prisma.projectComment.count({ where: { createdAt: { gte: since } } }),
    prisma.postComment.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since }, username: { not: null } } }),
  ]);

  return {
    newPosts,
    newComments: profileComments + projectComments + postComments,
    newMembers,
  };
}
