import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectBySlug, getProjectImages, addProjectImage, MAX_GALLERY_IMAGES } from "@/lib/projects";
import { MAX_IMAGE_BYTES, isAllowedImageMimeType, uploadImage } from "@/lib/storage";

// Phase 6.3 — Project Gallery.
//
// Each gallery upload is saved immediately as its own ProjectImage row —
// there's no project-level Save step for the gallery. That's *why* this
// isn't just another call to app/api/uploads/route.ts: this route needs
// to go straight from "authorized to add an image to this project" to
// "row exists", atomically enough that a client never has to separately
// POST a second request to attach an uploaded file to a project.
//
// Phase 6.4 — Project Creation Flow. This is also the exact route
// ProjectForm now calls in a loop right after a successful create, once
// the just-created project's slug is in hand (see that component's own
// comment) — so this route's contract (ownership check, MAX_GALLERY_IMAGES,
// one row per call) didn't need to change at all for that to work; only
// who calls it changed.

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (project.authorId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (!isAllowedImageMimeType(file.type)) {
    return NextResponse.json({ error: "unsupported-type" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "file-too-large" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 });
  }

  const currentImageCount = (await getProjectImages(project.id)).length;
  if (currentImageCount >= MAX_GALLERY_IMAGES) {
    return NextResponse.json({ error: "gallery-limit-reached" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const uploaded = await uploadImage({
      folder: "project-gallery",
      ownerId: session.user.id,
      mimeType: file.type,
      data: buffer,
    });

    // Per this phase's brief, captions are explicitly out of scope
    // ("не делать: подписи к изображениям") even though the schema has
    // an `alt` column — see ProjectImage's own comment in
    // prisma/schema.prisma. Always null here on purpose, not left for
    // the client to set.
    const image = await addProjectImage(project.id, session.user.id, {
      imageUrl: uploaded.url,
      alt: null,
    });

    if (!image) {
      // Ownership already checked above; only reachable if it changed
      // between that check and this write.
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("[api/projects/:slug/images] upload failed:", error);
    return NextResponse.json({ error: "upload-failed" }, { status: 502 });
  }
}
