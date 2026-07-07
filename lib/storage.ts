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
export const IMAGE_FOLDERS = {
  avatars: "avatars",
  banners: "banners",
  projectCovers: "project-covers",
  projectGallery: "project-gallery",
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
export function isPathOwnedBy(path: string, ownerId: string): boolean {
  const [folder, pathOwnerId] = path.split("/");
  return (
    ALL_IMAGE_FOLDERS.includes(folder as ImageFolder) && pathOwnerId === ownerId && pathOwnerId !== ""
  );
}
