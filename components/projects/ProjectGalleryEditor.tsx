"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import type { ProjectImage } from "@prisma/client";
import { isExternalUrl } from "@/lib/utils";
import { formLabelClasses } from "@/lib/form-styles";
import { MAX_GALLERY_IMAGES } from "@/lib/projects";

interface ProjectGalleryEditorProps {
  projectSlug: string;
  initialImages: ProjectImage[];
}

const UPLOAD_ERROR_MESSAGE = "Не вдалося завантажити зображення. Спробуйте ще раз.";
const DELETE_ERROR_MESSAGE = "Не вдалося видалити зображення. Спробуйте ще раз.";
// MAX_GALLERY_IMAGES itself now lives in lib/projects.ts — the server
// (app/api/projects/[slug]/images/route.ts) is still the actual
// enforcement point; this import is only so the button can disable
// itself instead of letting the user upload and then be rejected.

// Phase 6.3 — Project Gallery.
//
// Deliberately its own component, not folded into ProjectForm: every
// upload here saves immediately (its own ProjectImage row, via
// app/api/projects/[slug]/images/route.ts) rather than staging a value
// that only takes effect when the surrounding form's Save button is
// pressed — the same "immediate" behavior the brief describes for
// delete, applied consistently to add as well. That's also why this only
// ever renders on the edit page, never the create form: a project has to
// exist (and have a slug) before there's anywhere to upload a gallery
// image to.
export function ProjectGalleryEditor({ projectSlug, initialImages }: ProjectGalleryEditorProps) {
  const [images, setImages] = useState(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atLimit = images.length >= MAX_GALLERY_IMAGES;

  async function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploadError(false);
    setIsUploading(true);

    // Sequential, not Promise.all: keeps upload order == gallery order
    // (each request's `order` is "current max + 1" on the server — see
    // lib/projects.ts's addProjectImage) and avoids firing a burst of
    // concurrent multipart uploads from one click.
    for (const file of files) {
      if (images.length >= MAX_GALLERY_IMAGES) break;
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`/api/projects/${projectSlug}/images`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }
        const data: { image: ProjectImage } = await response.json();
        setImages((current) => [...current, data.image]);
      } catch (err) {
        console.error("[project-gallery-editor] upload failed:", err);
        setUploadError(true);
      }
    }

    setIsUploading(false);
  }

  async function handleDelete(imageId: string) {
    setDeleteError(false);
    setDeletingId(imageId);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/images/${imageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (err) {
      console.error("[project-gallery-editor] delete failed:", err);
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-line/60 pt-8">
      <div>
        <p className={formLabelClasses}>Gallery</p>
        <p className="mt-1 font-sans text-sm text-ash/80">
          Додаткові зображення проєкту. До {MAX_GALLERY_IMAGES} штук.
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-md border border-line/60 bg-graphite"
            >
              <Image
                src={image.imageUrl}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
                unoptimized={isExternalUrl(image.imageUrl)}
              />
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                disabled={deletingId === image.id}
                aria-label="Видалити зображення"
                className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-charcoal/80 p-1.5 text-bone transition-colors duration-fast hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
              >
                {deletingId === image.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <X size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={handleFilesChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || atLimit}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {isUploading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Завантаження…
          </>
        ) : (
          <>
            <Upload size={14} />
            {atLimit ? "Досягнуто ліміт" : "Додати зображення"}
          </>
        )}
      </button>

      {uploadError && <p className="font-mono text-[11px] text-brass">{UPLOAD_ERROR_MESSAGE}</p>}
      {deleteError && <p className="font-mono text-[11px] text-brass">{DELETE_ERROR_MESSAGE}</p>}
    </div>
  );
}
