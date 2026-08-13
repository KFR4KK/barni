"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { cn, isExternalUrl } from "@/lib/utils";
import { formFieldClasses, formLabelClasses } from "@/lib/form-styles";
import { MAX_POST_CONTENT_LENGTH } from "@/lib/posts";

interface PostFormProps {
  /** Where to land after a successful publish — the author's own profile
   * page if they have a claimed one, "/" otherwise. Resolved server-side
   * by app/posts/new/page.tsx (an async Server Component with access to
   * the session) and passed in as a plain prop, since this Client
   * Component has no session of its own to read (no SessionProvider is
   * set up in this app — every other page reads `auth()` server-side
   * instead; see components/auth/AuthNav.tsx). */
  redirectTo: string;
}

const SAVE_ERROR_MESSAGE = "Не вдалося опублікувати. Спробуйте ще раз.";
const UPLOAD_ERROR_MESSAGE = "Не вдалося завантажити зображення. Спробуйте ще раз.";
const UPLOAD_FOLDER = "posts/images";

// Phase 8.0 — Posts Foundation.
//
// A stripped-down cousin of components/projects/ProjectForm.tsx: same
// "upload the image the moment it's picked, submit the post afterward"
// flow (see that component's own comment for why the cover-image side of
// it works this way — the same reasoning applies here, unchanged), same
// generic /api/uploads endpoint, same orphaned-upload cleanup on
// remove/replace. What's dropped: no gallery, no title/visibility/links
// — this phase's brief is a textarea, one optional image, and a submit
// button, nothing else.
export function PostForm({ redirectTo }: PostFormProps) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  // Storage path of an image uploaded during this form session — used
  // only to clean up an upload that gets swapped out or removed before
  // publishing. Same role as ProjectForm's `uploadedPath`.
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function discardOrphanUpload(path: string) {
    fetch("/api/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch((err) => {
      console.error("[post-form] failed to discard orphaned upload:", err);
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(false);
    setIsUploading(true);

    const previousUploadedPath = uploadedPath;

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", UPLOAD_FOLDER);

      const response = await fetch("/api/uploads", { method: "POST", body: form });
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      const data: { url: string; path: string } = await response.json();

      setImageUrl(data.url);
      setUploadedPath(data.path);

      if (previousUploadedPath) {
        discardOrphanUpload(previousUploadedPath);
      }
    } catch (err) {
      console.error("[post-form] image upload failed:", err);
      setUploadError(true);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage() {
    setImageUrl("");
    if (uploadedPath) {
      discardOrphanUpload(uploadedPath);
      setUploadedPath(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, imageUrl: imageUrl || null }),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // No dedicated post detail page in this phase (the brief only
      // asks for the create form) — land back on the author's own
      // profile, where PostsSection already re-fetches and shows the
      // new post.
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error("[post-form] publish failed:", err);
      setError(true);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor="content" className={formLabelClasses}>
          Текст
        </label>
        <textarea
          id="content"
          name="content"
          rows={6}
          required
          minLength={1}
          maxLength={MAX_POST_CONTENT_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className={cn(formFieldClasses, "resize-y leading-relaxed")}
        />
        <p className="font-sans text-[10px] text-ash/70">
          {content.length}/{MAX_POST_CONTENT_LENGTH}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={formLabelClasses}>Зображення (необов&apos;язково)</label>

        {imageUrl && (
          <div className="relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-md border border-line/60 bg-graphite">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="384px"
              className="object-cover"
              unoptimized={isExternalUrl(imageUrl)}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={isUploading}
              aria-label="Прибрати зображення"
              className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-charcoal/80 p-1.5 text-bone transition-colors duration-fast hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-line px-4 py-2 font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Завантаження…
            </>
          ) : (
            <>
              <Upload size={14} />
              {imageUrl ? "Змінити зображення" : "Додати зображення"}
            </>
          )}
        </button>
        {uploadError && <p className="font-sans text-[11px] text-brass">{UPLOAD_ERROR_MESSAGE}</p>}
      </div>

      {error && <p className="font-sans text-xs text-brass">{SAVE_ERROR_MESSAGE}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting || isUploading || content.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 font-sans text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Публікація…
            </>
          ) : (
            "Опублікувати"
          )}
        </button>
      </div>
    </form>
  );
}
