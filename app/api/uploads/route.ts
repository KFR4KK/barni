import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  ALL_IMAGE_FOLDERS,
  IMAGE_FOLDERS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_AUDIO_BYTES,
  deleteImage,
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
  isAllowedAudioMimeType,
  isPathOwnedBy,
  uploadImage,
  uploadVideo,
  uploadAudio,
  type ImageFolder,
} from "@/lib/storage";

// Phase 12 — Profile Redesign. `banners` and `profile-media` accept
// either an image (incl. GIF) or a short muted video — the banner and
// the optional custom widget block both support the same three media
// kinds per the brief. `profile-music` is audio-only. Every other
// existing folder keeps the original image-only behavior.
type MediaKind = "image" | "image-or-video" | "audio";

const FOLDER_MEDIA_KIND: Record<ImageFolder, MediaKind> = {
  [IMAGE_FOLDERS.avatars]: "image",
  [IMAGE_FOLDERS.banners]: "image-or-video",
  [IMAGE_FOLDERS.projectCovers]: "image",
  [IMAGE_FOLDERS.projectGallery]: "image",
  [IMAGE_FOLDERS.postImages]: "image",
  [IMAGE_FOLDERS.profileMedia]: "image-or-video",
  [IMAGE_FOLDERS.profileMusic]: "audio",
};

// Phase 6.2 — Project Image Upload.
//
// Generic upload endpoint over lib/storage.ts — deliberately not named
// app/api/projects/[slug]/cover or similar, per the brief's "не создавать
// отдельную систему только для проектов". The only folder reachable
// through *this* route is `project-covers`; avatars/banners are already
// in lib/storage.ts's ALL_IMAGE_FOLDERS but intentionally rejected below
// until a later phase turns them on.
//
// Note: `project-gallery` (Phase 6.3) is a different case, not just "not
// enabled yet" — gallery uploads go through their own route,
// app/api/projects/[slug]/images/route.ts, which calls lib/storage.ts's
// uploadImage() directly. Each gallery upload also needs to create a
// ProjectImage row scoped to a specific, ownership-checked Project, which
// this generic endpoint has no notion of — routing it through here first
// would just mean re-deriving that same project/ownership context a
// second time for no benefit.
// Phase 8.0 — Posts Foundation. `posts/images` added alongside
// `project-covers` — PostForm uploads through this exact same route
// (see that component), no new upload endpoint.
// Phase 12 — Profile Redesign. `banners`, `profile-media` (the optional
// custom widget block), and `profile-music` (the mini player's uploaded
// track) added the same way.
const FOLDERS_ENABLED_THIS_PHASE: ImageFolder[] = [
  "project-covers",
  IMAGE_FOLDERS.postImages,
  IMAGE_FOLDERS.banners,
  IMAGE_FOLDERS.profileMedia,
  IMAGE_FOLDERS.profileMusic,
];

function isEnabledFolder(value: unknown): value is ImageFolder {
  return (
    typeof value === "string" &&
    (ALL_IMAGE_FOLDERS as string[]).includes(value) &&
    (FOLDERS_ENABLED_THIS_PHASE as string[]).includes(value)
  );
}

// POST — upload a new image. multipart/form-data: `file`, `folder`.
// Used by ProjectForm as soon as the user picks a file, well before the
// project itself is saved (see that component for why: it needs the
// resulting URL in hand to submit the create/update request at all).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const folder = form.get("folder");
  if (!isEnabledFolder(folder)) {
    return NextResponse.json({ error: "invalid-folder" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 });
  }

  // Never trust the client's declared MIME type alone in principle, but
  // there's no image-decoding/transcoding step in this phase (no crop/
  // resize/transcode), so the browser-supplied `file.type` plus a hard
  // size cap is the full extent of server-side validation here — still
  // enforced server-side, not only via the <input accept="…"> the form
  // also sets. Phase 12 — Profile Redesign: which check/cap/uploader
  // applies depends on the folder's media kind, since this route now
  // accepts video and audio, not just images.
  const kind = FOLDER_MEDIA_KIND[folder];
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (kind === "audio") {
      if (!isAllowedAudioMimeType(file.type)) {
        return NextResponse.json({ error: "unsupported-type" }, { status: 400 });
      }
      if (file.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: "file-too-large" }, { status: 400 });
      }
      const uploaded = await uploadAudio({ folder, ownerId: session.user.id, mimeType: file.type, data: buffer });
      return NextResponse.json(
        { url: uploaded.url, path: uploaded.path, mediaType: "AUDIO" },
        { status: 201 }
      );
    }

    if (kind === "image-or-video" && isAllowedVideoMimeType(file.type)) {
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: "file-too-large" }, { status: 400 });
      }
      const uploaded = await uploadVideo({ folder, ownerId: session.user.id, mimeType: file.type, data: buffer });
      return NextResponse.json(
        { url: uploaded.url, path: uploaded.path, mediaType: "VIDEO" },
        { status: 201 }
      );
    }

    if (!isAllowedImageMimeType(file.type)) {
      return NextResponse.json({ error: "unsupported-type" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "file-too-large" }, { status: 400 });
    }
    const uploaded = await uploadImage({ folder, ownerId: session.user.id, mimeType: file.type, data: buffer });
    const mediaType = file.type === "image/gif" ? "GIF" : "IMAGE";
    return NextResponse.json({ url: uploaded.url, path: uploaded.path, mediaType }, { status: 201 });
  } catch (error) {
    console.error("[api/uploads] upload failed:", error);
    return NextResponse.json({ error: "upload-failed" }, { status: 502 });
  }
}

// DELETE — discard an upload the user made but never actually saved onto
// a project (picked a different cover before submitting, or abandoned
// the form). Per the brief's point 6: not optional cleanup, since
// nothing else ever deletes these orphaned objects. Ownership is checked
// against the path itself (see lib/storage.ts's isPathOwnedBy) rather
// than any database row — there may not be one yet, e.g. on the create
// form before the project is saved at all.
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const path = (body as Record<string, unknown> | null)?.path;
  if (typeof path !== "string" || !path) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }

  if (!isPathOwnedBy(path, session.user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await deleteImage(path);
  } catch (error) {
    // Non-fatal: the client only calls this to keep Storage tidy, not as
    // a step the UI depends on succeeding.
    console.error("[api/uploads] delete failed:", error);
  }

  return NextResponse.json({ ok: true });
}
