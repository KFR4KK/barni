"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageIcon, Loader2, Smile, UserRound, X } from "lucide-react";
import { cn, isExternalUrl } from "@/lib/utils";
import { MAX_POST_CONTENT_LENGTH } from "@/lib/posts";

interface PostComposerProps {
  /** The signed-in viewer's own avatar/name — shown in the collapsed row
   * and next to the textarea once expanded. Always the current user: this
   * composer only ever creates a post authored by whoever's looking at
   * it, same as the old /posts/new page. */
  avatarUrl: string | null;
  displayName: string;
  /** Where to navigate after a successful publish. Omitted by every
   * current caller (Feed, Profile) — both keep the visitor on the same
   * page and just refresh it, the same `router.refresh()` PostForm
   * already relied on, so the new post reappears via the page's own
   * existing fetch (getFeed()/getPostsByUserId()) rather than a
   * client-side splice. Kept optional, not removed, so a future page
   * that *does* want to land somewhere else after publishing (the way
   * the old standalone /posts/new page did) can still pass it in without
   * this component growing a second variant. */
  redirectTo?: string;
  /** "feed" — pill-shaped collapsed bar for the Feed page layout. */
  variant?: "default" | "feed";
  className?: string;
}

const SAVE_ERROR_MESSAGE = "Не вдалося опублікувати. Спробуйте ще раз.";
const UPLOAD_ERROR_MESSAGE = "Не вдалося завантажити зображення. Спробуйте ще раз.";
const UPLOAD_FOLDER = "posts/images";
const COMPOSER_PLACEHOLDER = "Поділіться новинами, покажіть роботу або поставте питання...";
const FEED_COMPOSER_PLACEHOLDER = "Поділіться новинами";

// Textarea auto-grow bounds. min-h-[1 line], max-h-[~10 lines] — the
// brief's own numbers. Measured against this field's actual classes
// (text-sm/leading-relaxed = 14px * 1.625 ≈ 22.75px per line) plus its
// vertical padding (py-2.5 = 20px), rounded to clean pixel values.
const TEXTAREA_MIN_HEIGHT = 44;
const TEXTAREA_MAX_HEIGHT = 248;

// Phase 9.4 — Inline Post Composer.
//
// This is PostForm's successor for every *inline* use (Feed, and now
// Profile's own Posts section) — not a rewrite of the create flow, which
// is still exactly `POST /api/posts` plus the existing `/api/uploads`
// upload endpoint (see PostForm.tsx's own comment for why that upload
// works the way it does; unchanged here, copied verbatim). What's new is
// purely presentational: a one-line collapsed bar that expands in place
// instead of navigating to a dedicated page. PostForm itself is left
// alone for /posts/new's backward-compat page — this isn't a refactor of
// that component, it's a sibling that happens to share its submit logic.
export function PostComposer({
  avatarUrl,
  displayName,
  redirectTo,
  variant = "default",
  className,
}: PostComposerProps) {
  const router = useRouter();
  const isFeed = variant === "feed";
  const placeholder = isFeed ? FEED_COMPOSER_PLACEHOLDER : COMPOSER_PLACEHOLDER;

  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDraft = content.trim().length > 0 || Boolean(imageUrl);

  // Click outside collapses the composer — but only an empty one. Same
  // mousedown-listener pattern components/auth/UserMenu.tsx already uses
  // for its dropdown, reused rather than reinvented.
  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: MouseEvent) {
      if (hasDraft) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [expanded, hasDraft]);

  // Auto-grow the textarea between 1 and ~10 lines, no manual resize
  // handle — reset to "auto" first so shrinking (e.g. after deleting a
  // line) is measured correctly, then clamp to the max.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [content, expanded]);

  function discardOrphanUpload(path: string) {
    fetch("/api/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch((err) => {
      console.error("[post-composer] failed to discard orphaned upload:", err);
    });
  }

  // Identical to PostForm's own handleFileChange: upload immediately on
  // pick through the existing generic /api/uploads endpoint, show the
  // preview, and clean up a swapped-out upload. No new API.
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
      console.error("[post-composer] image upload failed:", err);
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

  function resetDraft() {
    setContent("");
    setImageUrl("");
    setUploadedPath(null);
    setUploadError(false);
    setError(false);
  }

  function handleCancel() {
    resetDraft();
    setExpanded(false);
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

      resetDraft();
      setExpanded(false);

      if (redirectTo) {
        router.push(redirectTo);
      }
      // Same as PostForm's post-publish refresh: re-run the current
      // page's server fetch (getFeed() / getPostsByUserId(), depending
      // on which page rendered this composer) so the new post shows up
      // without a full reload.
      router.refresh();
    } catch (err) {
      console.error("[post-composer] publish failed:", err);
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const avatar = (
    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-graphite">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          fill
          sizes="36px"
          className="object-cover"
          unoptimized={isExternalUrl(avatarUrl)}
        />
      ) : (
        <UserRound className="h-full w-full p-1.5 text-ash" aria-hidden="true" />
      )}
    </span>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "border border-line/50 bg-charcoal/20 transition-colors duration-base",
        isFeed ? "rounded-[20px] shadow-card" : "rounded-card border-line/60 bg-charcoal/30",
        expanded && "border-line",
        className
      )}
    >
      {/* Collapsed state: a single compact row, styled like the rest of
         the composer rather than a separate form — clicking it (not a
         navigation Link anymore) expands in place. */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cn(
            "flex w-full items-center gap-3 text-left transition-colors duration-fast hover:bg-charcoal/50",
            isFeed ? "rounded-[20px] px-5 py-4" : "rounded-card px-4 py-3"
          )}
        >
          {avatar}
          <span className="truncate font-sans text-sm text-ash/70">{placeholder}</span>
        </button>
      )}

      {expanded && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 transition-[opacity] duration-base">
          <div className="flex items-start gap-3">
            {avatar}
            <textarea
              ref={textareaRef}
              autoFocus
              rows={1}
              required
              minLength={1}
              maxLength={MAX_POST_CONTENT_LENGTH}
              placeholder={placeholder}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              style={{ height: TEXTAREA_MIN_HEIGHT, maxHeight: TEXTAREA_MAX_HEIGHT }}
              className="w-full flex-1 resize-none overflow-y-auto rounded-md border border-line bg-charcoal/40 px-4 py-2.5 font-sans text-sm leading-relaxed text-bone placeholder:text-ash/60 transition-colors duration-fast focus:border-brass focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
            />
          </div>

          {/* Preview fades/grows in the same way PostForm's did — same
             markup, just without the "Зображення" label since this
             composer has no other field it needs to be distinguished
             from. */}
          {imageUrl && (
            <div className="relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-md border border-line/60 bg-graphite transition-opacity duration-base">
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
          {uploadError && <p className="font-mono text-[11px] text-brass">{UPLOAD_ERROR_MESSAGE}</p>}

          <div className="flex items-center justify-between gap-4 border-t border-line/60 pt-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs text-ash transition-colors duration-fast hover:bg-charcoal hover:text-brass disabled:opacity-60"
              >
                {isUploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ImageIcon size={15} />
                )}
                {imageUrl ? "Змінити фото" : "Додати фото"}
              </button>

              {/* Reserved for future reactions/emoji — intentionally
                 disabled, per the brief, rather than left out entirely. */}
              <button
                type="button"
                disabled
                title="Незабаром"
                className="inline-flex items-center justify-center rounded-full p-1.5 text-ash/40"
              >
                <Smile size={15} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {hasDraft && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:text-bone disabled:opacity-60"
                >
                  Скасувати
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || isUploading || content.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
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
          </div>

          {error && <p className="font-mono text-xs text-brass">{SAVE_ERROR_MESSAGE}</p>}
        </form>
      )}
    </div>
  );
}
