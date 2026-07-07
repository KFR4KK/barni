import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/projects";
import { getUserDisplayById } from "@/lib/follows";
import {
  createProjectComment,
  getProjectCommentById,
  getProjectComments,
  MAX_COMMENT_LENGTH,
} from "@/lib/project-comments";
import { createNotification } from "@/lib/notifications";

// Phase 8.1 — Project Comments.
//
// Same route shape as app/api/users/[username]/profile-comments/route.ts,
// keyed by the project's `slug` instead of a username — resolved through
// lib/projects.ts's existing getProjectBySlug rather than a new lookup.
//
// Unlike Profile Comments, a project can be PRIVATE (see
// ProjectVisibility on the Project model) — both GET and POST 404 for a
// PRIVATE project unless the requester is its author, the same
// visibility rule app/projects/[slug]/page.tsx already enforces for the
// project page itself. A public project's comments are otherwise just as
// public as the profile comments GET route, so no auth() check gates the
// read for a public project.

async function resolveVisibleProject(slug: string, viewerId: string | undefined) {
  const project = await getProjectBySlug(slug);
  if (!project) return null;
  if (project.visibility === "PRIVATE" && viewerId !== project.authorId) return null;
  return project;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const project = await resolveVisibleProject(slug, session?.user?.id);
  if (!project) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const comments = await getProjectComments(project.id);
  return NextResponse.json({ comments });
}

function readCreateInput(body: unknown): { content: string; parentId: string | null } | null {
  if (typeof body !== "object" || body === null) return null;
  const { content, parentId } = body as Record<string, unknown>;
  if (typeof content !== "string") return null;

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return null;

  if (parentId !== undefined && parentId !== null && typeof parentId !== "string") return null;

  return { content: trimmed, parentId: typeof parentId === "string" ? parentId : null };
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await resolveVisibleProject(slug, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const input = readCreateInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  // Null here means either the body's parentId didn't resolve to a
  // top-level comment on this project, or it pointed at a reply — same
  // "you tried to reply to something you can't reply to" case as
  // createProfileComment.
  const created = await createProjectComment(project.id, session.user.id, input);
  if (!created) {
    return NextResponse.json({ error: "invalid-parent" }, { status: 400 });
  }

  // Same split as app/api/users/[username]/profile-comments/route.ts: a
  // reply notifies the parent comment's author, a top-level comment
  // notifies the project's author. createNotification skips the
  // self-notification case (e.g. the project author commenting on their
  // own project).
  if (created.parentId) {
    const parent = await getProjectCommentById(created.parentId);
    if (parent) {
      await createNotification({
        recipientId: parent.authorId,
        actorId: session.user.id,
        type: "COMMENT_REPLY",
        entityId: created.id,
      });
    }
  } else {
    await createNotification({
      recipientId: project.authorId,
      actorId: session.user.id,
      type: "PROJECT_COMMENT",
      entityId: created.id,
    });
  }

  // Same reasoning as the profile-comments POST route: the client needs
  // the new comment's author display immediately, without a full
  // refetch of the list.
  const author = await getUserDisplayById(session.user.id);

  return NextResponse.json({
    comment: {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt,
      authorId: created.authorId,
      parentId: created.parentId,
      author,
    },
  });
}
