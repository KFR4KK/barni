import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Phase 6.2 — Project Image Upload.
//
// The single point of contact with Supabase Storage for the whole app —
// per this phase's brief, no Route Handler or component is allowed to
// talk to Storage directly. Every future upload surface (avatars,
// banners, project galleries, ...) is meant to call the functions below
// instead of growing its own copy of this logic.
//
// One bucket (SUPABASE_STORAGE_BUCKET), split into folders by purpose —
// not one bucket per entity. This phase only ever passes
// `IMAGE_FOLDERS.projectCovers`, but the folder list already carries the
// shapes the brief names as "future": avatars, banners, project gallery.
// Phase 12 — Profile Redesign. `banners` already existed as a folder
// name but was never wired up to a route until now; profileMedia backs
// the optional custom widget block, profileMusic backs the mini music
// player. Despite the constant's name, these two new folders (and, as
// of this phase, `banners`) can hold video/audio objects too — see
// uploadVideo/uploadAudio below — "image folder" now really means
// "folder in the one Storage bucket this module owns", not literally
// image-only.
export const IMAGE_FOLDERS = {
  avatars: "avatars",
  banners: "banners",
  projectCovers: "project-covers",
  projectGallery: "project-gallery",
  // Phase 8.0 — Posts Foundation. Value is two path segments, not one —
  // uploadImage builds the object path as `${folder}/${ownerId}/${uuid}.${ext}`,
  // so this produces `posts/images/{userId}/{uuid}.ext`, matching the
  // brief's requested layout, without uploadImage itself needing to know
  // any folder is "nested".
  postImages: "posts/images",
  // Phase 12 — Profile Redesign.
  profileMedia: "profile-media",
  profileMusic: "profile-music",
} as const;

export type ImageFolder = (typeof IMAGE_FOLDERS)[keyof typeof IMAGE_FOLDERS];

// Every folder this module will write to or delete from. Doubles as the
// allow-list Route Handlers check an incoming `folder` value against
// before calling uploadImage/deleteImage — never trust a folder string
// that came from the client without checking it against this set first.
export const ALL_IMAGE_FOLDERS: ImageFolder[] = Object.values(IMAGE_FOLDERS);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isAllowedImageMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TO_EXTENSION;
}

// SUPABASE_URL in this project's .env is set to the REST endpoint
// (".../rest/v1/") rather than the bare project URL — harmless for the
// REST client, but the Storage client needs the bare
// "https://xxx.supabase.co" origin to build correct public URLs. Rather
// than ask for a second, easy-to-desync env var, this module normalizes
// the one that already exists.
function resolveProjectUrl(): string {
  const raw = process.env.SUPABASE_URL;
  if (!raw) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function resolveBucket(): string {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error("Missing SUPABASE_STORAGE_BUCKET environment variable.");
  }
  return bucket;
}

// Server-only singleton, same dev-hot-reload-safe pattern as
// lib/db.ts's PrismaClient. Uses the service role key — this client must
// never be imported from a Client Component or leaked to the browser.
const globalForSupabase = globalThis as unknown as { supabaseAdmin?: SupabaseClient };

function getSupabaseAdmin(): SupabaseClient {
  if (!globalForSupabase.supabaseAdmin) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
    }
    globalForSupabase.supabaseAdmin = createClient(resolveProjectUrl(), serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return globalForSupabase.supabaseAdmin;
}

export interface UploadImageInput {
  folder: ImageFolder;
  /** Used to namespace the object path (e.g. the uploading user's id) and
   *  to authorize later deletes — see isPathOwnedBy below. */
  ownerId: string;
  mimeType: string;
  data: Buffer;
}

export interface UploadedImage {
  /** Public URL — what gets stored on the row (Project.coverImage, etc). */
  url: string;
  /** Storage object path — what deleteImage needs back. */
  path: string;
}

// Validates nothing itself (callers must check size/MIME before calling
// this — see isAllowedImageMimeType/MAX_IMAGE_BYTES above); this function
// only uploads and returns the public URL + path.
export async function uploadImage({
  folder,
  ownerId,
  mimeType,
  data,
}: UploadImageInput): Promise<UploadedImage> {
  const extension = ALLOWED_MIME_TO_EXTENSION[mimeType];
  if (!extension) {
    throw new Error(`Unsupported image MIME type: ${mimeType}`);
  }
  return uploadObject(folder, ownerId, mimeType, data, extension);
}

// Phase 12 — Profile Redesign. Banner videos (short, muted, looping —
// see the brief) and the same for the optional custom widget block.
// Shares uploadObject/the one Storage bucket with uploadImage rather
// than being a separate code path — the only real difference is which
// MIME map validates the upload.
const ALLOWED_VIDEO_MIME_TO_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

// Meaningfully larger than MAX_IMAGE_BYTES — these are short, muted
// looping clips, not full-length video, but still video.
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

export function isAllowedVideoMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_VIDEO_MIME_TO_EXTENSION;
}

export async function uploadVideo(input: UploadImageInput): Promise<UploadedImage> {
  const extension = ALLOWED_VIDEO_MIME_TO_EXTENSION[input.mimeType];
  if (!extension) {
    throw new Error(`Unsupported video MIME type: ${input.mimeType}`);
  }
  return uploadObject(input.folder, input.ownerId, input.mimeType, input.data, extension);
}

// Phase 12 — Profile Redesign. The mini music player's uploaded track —
// per the brief, local files only (mp3/wav/ogg), never a streaming
// integration.
const ALLOWED_AUDIO_MIME_TO_EXTENSION: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

export function isAllowedAudioMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_AUDIO_MIME_TO_EXTENSION;
}

export async function uploadAudio(input: UploadImageInput): Promise<UploadedImage> {
  const extension = ALLOWED_AUDIO_MIME_TO_EXTENSION[input.mimeType];
  if (!extension) {
    throw new Error(`Unsupported audio MIME type: ${input.mimeType}`);
  }
  return uploadObject(input.folder, input.ownerId, input.mimeType, input.data, extension);
}

// The one function that actually talks to Supabase Storage's upload API
// — uploadImage/uploadVideo/uploadAudio are thin, MIME-map-specific
// wrappers around this, so there's exactly one place that builds object
// paths and calls `.upload(...)`.
async function uploadObject(
  folder: ImageFolder,
  ownerId: string,
  mimeType: string,
  data: Buffer,
  extension: string
): Promise<UploadedImage> {
  const path = `${folder}/${ownerId}/${crypto.randomUUID()}.${extension}`;
  const bucket = resolveBucket();

  const { error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .upload(path, data, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(path);
  return { url: publicUrlData.publicUrl, path };
}

// Best-effort delete — callers (Route Handlers) should treat a thrown/
// rejected delete as non-fatal to the request that triggered it (e.g. a
// project save should still succeed even if cleaning up the old cover
// image failed); log and move on rather than surfacing a 500 for it.
export async function deleteImage(path: string): Promise<void> {
  const bucket = resolveBucket();
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Supabase Storage delete failed: ${error.message}`);
  }
}

// Whether `url` was produced by uploadImage() above (as opposed to a
// pre-existing external URL a user pasted in an earlier phase — see
// prisma/schema.prisma / this phase's brief, point 5 & 7: external URLs
// are left alone, only our own Storage objects are ever deleted).
export function isOwnStorageUrl(url: string): boolean {
  try {
    const bucket = resolveBucket();
    const prefix = `${resolveProjectUrl()}/storage/v1/object/public/${bucket}/`;
    return url.startsWith(prefix);
  } catch {
    return false;
  }
}

// Inverse of the URL building in uploadImage's getPublicUrl call — turns
// a public URL back into the object path deleteImage needs. Returns null
// if `url` isn't one of ours (callers should always guard with
// isOwnStorageUrl first; this is a small extra safety net).
export function getStoragePath(url: string): string | null {
  if (!isOwnStorageUrl(url)) return null;
  const bucket = resolveBucket();
  const prefix = `${resolveProjectUrl()}/storage/v1/object/public/${bucket}/`;
  return url.slice(prefix.length) || null;
}

// Authorization guard for deletes triggered by a client-supplied path
// (the "discard an unsaved upload" flow — app/api/uploads/route.ts's
// DELETE handler): every path this module writes is shaped
// `${folder}/${ownerId}/${uuid}.${ext}`, so ownership can be checked
// without a database lookup, the same "encode the check into the path"
// idiom lib/projects.ts's updateProject uses at the DB layer.
//
// Matches by full folder prefix rather than splitting on the first "/"
// — folder values aren't all a single path segment (see IMAGE_FOLDERS.
// postImages = "posts/images"), so naively taking path.split("/")[0]
// would read "posts" as the folder and "images" as the owner id for
// every post upload. Finding which known folder the path actually
// starts with handles both the one-segment and two-segment cases the
// same way.
export function isPathOwnedBy(path: string, ownerId: string): boolean {
  const folder = ALL_IMAGE_FOLDERS.find((candidate) => path.startsWith(`${candidate}/`));
  if (!folder) return false;

  const pathOwnerId = path.slice(folder.length + 1).split("/")[0];
  return pathOwnerId === ownerId && pathOwnerId !== "";
}
