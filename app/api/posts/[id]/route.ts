import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deletePostIfOwned,
  getPostById,
  updatePost,
  MAX_POST_CONTENT_LENGTH,
  MIN_POST_CONTENT_LENGTH,
} from "@/lib/posts";
import { deleteImage, getStoragePath, isOwnStorageUrl } from "@/lib/storage";

// Phase 8.0 — Posts Foundation.
//
// Same shape as app/api/projects/[slug]/route.ts. Ownership is checked
// twice, deliberately: once here (a clean 403 for a non-owner instead of
// a confusing 404), and again inside lib/posts.ts's updatePost/
// deletePostIfOwned, which scope their writes to `{ id, userId }` — the
// second check is the one that actually can't be bypassed.
//
// No `/posts/[id]/edit` page exists yet in this phase (the brief only
// asks for `/posts/new`), so PATCH has no caller today — it exists ahead
// of that UI, same as the brief explicitly requests, rather than being
// added later alongside it.

interface UpdateBody {
  content: string;
  imageUrl: string | null;
}

function readUpdateInput(body: unknown): UpdateBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { content, imageUrl } = body as Record<string, unknown>;
  if (typeof content !== "string") return null;

  const trimmedContent = content.trim();
  if (trimmedContent.length < MIN_POST_CONTENT_LENGTH) return null;
  if (trimmedContent.length > MAX_POST_CONTENT_LENGTH) return null;

  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

  return { content: trimmedContent, imageUrl: trimmedImageUrl || null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPostById(id);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const input = readUpdateInput(body);
  if (!input) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  const updated = await updatePost(existing.id, session.user.id, input);
  if (!updated) {
    // Only reachable if ownership changed between the check above and
    // this write — belt-and-suspenders, not the expected path.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Same "clean up the old image, but only if it was ever one of ours"
  // reasoning as app/api/projects/[slug]/route.ts's PATCH handler —
  // best-effort and after the write succeeds, so a Storage hiccup never
  // blocks (or rolls back) the save itself.
  if (existing.imageUrl && existing.imageUrl !== updated.imageUrl && isOwnStorageUrl(existing.imageUrl)) {
    const oldPath = getStoragePath(existing.imageUrl);
    if (oldPath) {
      deleteImage(oldPath).catch((error) => {
        console.error("[api/posts/:id] failed to delete old image:", error);
      });
    }
  }

  return NextResponse.json({ post: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPostById(id);
  if (!existing) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deleted = await deletePostIfOwned(existing.id, session.user.id);
  if (!deleted) {
    // Only reachable if ownership changed between the check above and
    // this write — belt-and-suspenders, not the expected path.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Brief: if the image lives in our Storage, delete it; if it's an
  // external URL, leave it alone. Same isOwnStorageUrl-gated,
  // best-effort cleanup as every other delete path in this app.
  if (deleted.imageUrl && isOwnStorageUrl(deleted.imageUrl)) {
    const path = getStoragePath(deleted.imageUrl);
    if (path) {
      deleteImage(path).catch((error) => {
        console.error("[api/posts/:id] failed to delete image during post delete:", error);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
