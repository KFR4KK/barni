import { getAllPosts, type PostWithAuthor } from "@/lib/posts";
import { getPublicProjects, type ProjectListItem } from "@/lib/projects";

// Phase 8.2 — Feed (MVP).
//
// The Feed has no model and no table of its own (per the brief: "Feed
// должен формироваться динамически") — it's a read-time merge of two
// existing, unrelated content tables (Post, Project), each already owned
// by its own lib module (lib/posts.ts, lib/projects.ts). This file is the
// one place that merges them; nothing else (the /feed page included)
// combines the two arrays itself, so a future personalized feed,
// recommendations pass, or Infinite Scroll/pagination layer has exactly
// one function to change, not a page-level `[...posts, ...projects].sort()`
// duplicated wherever a feed is rendered.
//
// A discriminated union, not a lowest-common-denominator shared shape
// (e.g. `{ id, title, excerpt, createdAt }`): Post and Project don't
// actually share a rendering shape (a post has no title, a project has
// no imageUrl), and PostCard/ProjectCard already expect their own real
// types. `type` is what lets the page render each item with the right
// existing card component while staying fully type-safe — narrowing on
// `item.type` tells TypeScript which of `.post`/`.project` is present.
export type FeedItem =
  | { type: "post"; post: PostWithAuthor }
  | { type: "project"; project: ProjectListItem };

// Fetches both sources in parallel, tags each row with its `type`, then
// merges and sorts by `createdAt` DESC — the one ordering rule the brief
// specifies. Both `getAllPosts`/`getPublicProjects` already return
// newest-first from the database, but a stable merge of two independently
// sorted arrays still needs its own sort once they're interleaved.
export async function getFeed(): Promise<FeedItem[]> {
  const [posts, projects] = await Promise.all([getAllPosts(), getPublicProjects()]);

  const items: FeedItem[] = [
    ...posts.map((post): FeedItem => ({ type: "post", post })),
    ...projects.map((project): FeedItem => ({ type: "project", project })),
  ];

  return items.sort((a, b) => {
    const aDate = a.type === "post" ? a.post.createdAt : a.project.createdAt;
    const bDate = b.type === "post" ? b.post.createdAt : b.project.createdAt;
    return bDate.getTime() - aDate.getTime();
  });
}
