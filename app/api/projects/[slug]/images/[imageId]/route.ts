import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectBySlug, deleteProjectImageIfOwned } from "@/lib/projects";
import { deleteImage, getStoragePath, isOwnStorageUrl } from "@/lib/storage";

// Phase 6.3 — Project Gallery. Point 3 of the brief: deleting an image
// removes both the DB row and the Storage object. Ownership is checked
// twice, same belt-and-suspenders reasoning as
// app/api/projects/[slug]/route.ts's PATCH handler: once here (a clean
// 403/404 for a non-owner) and again inside
// deleteProjectImageIfOwned's own query (the check that actually can't
// be bypassed).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; imageId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug, imageId } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (project.authorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const deleted = await deleteProjectImageIfOwned(imageId, project.id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  // Every gallery image is one of ours (unlike coverImage, which can
  // carry a pre-6.2 external URL) — uploadImage() is the only thing
  // that ever creates a ProjectImage row (see addProjectImage) — but
  // this guard costs nothing and matches the same caution the cover
  // image cleanup uses in the PATCH route.
  if (isOwnStorageUrl(deleted.imageUrl)) {
    const path = getStoragePath(deleted.imageUrl);
    if (path) {
      try {
        await deleteImage(path);
      } catch (error) {
        // The DB row is already gone; a failed Storage delete just
        // leaves an orphaned object rather than breaking the request.
        console.error("[api/projects/:slug/images/:imageId] storage delete failed:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
