"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import type { Project, ProjectVisibility } from "@prisma/client";
import { cn, isExternalUrl } from "@/lib/utils";
import { formFieldClasses, formLabelClasses } from "@/lib/form-styles";
import { MAX_GALLERY_IMAGES } from "@/lib/projects";

interface ProjectFormProps {
  mode: "create" | "edit";
  /** Required when mode === "edit"; ignored otherwise. */
  project?: Project;
}

const SAVE_ERROR_MESSAGE = "Не вдалося зберегти проєкт. Спробуйте ще раз.";
const UPLOAD_ERROR_MESSAGE = "Не вдалося завантажити зображення. Спробуйте ще раз.";
const UPLOAD_FOLDER = "project-covers";

// A file picked for the gallery during *create*, staged client-side
// only. `previewUrl` is a local blob: URL (URL.createObjectURL), never
// sent anywhere — it exists purely so the user sees a thumbnail before
// the file has touched the network at all.
interface StagedGalleryItem {
  file: File;
  previewUrl: string;
}

// Phase 6.1 — Projects Foundation.
//
// A Client Component, not a Server Action form (unlike /profile/edit's
// form) — it posts to app/api/projects/route.ts (create) or
// app/api/projects/[slug]/route.ts (edit) and needs the JSON response
// (specifically the generated slug on create) to navigate to
// `/projects/[slug]` afterward. Same reasoning as
// components/members/FollowSection.tsx for why this one feature needs a
// client boundary + fetch instead of a plain <form action={...}>.
//
// Phase 6.4 — Project Creation Flow. Create mode now also lets the user
// pick gallery images before the project exists (see the
// StagedGalleryItem state below). Cover image behavior is unchanged from
// 6.2/6.3 — it already uploads to Storage as soon as it's picked (see
// handleCoverFileChange) and only becomes part of the project on submit,
// which was never actually incompatible with "one continuous action":
// uploadImage() only ever needed the signed-in user's id, never a
// projectId, so there was nothing structurally forcing that flow into a
// second step. The gallery is different — addProjectImage() requires a
// real projectId — so gallery files are staged as plain File objects in
// component state and only uploaded (looping the same
// POST /api/projects/[slug]/images ProjectGalleryEditor already uses)
// once handleSubmit has a slug in hand. This is a smaller change than it
// might first look: no new upload endpoint, no new ProjectImage-writing
// code — just a new caller of the two routes that already exist.
export function ProjectForm({ mode, project }: ProjectFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [coverImage, setCoverImage] = useState(project?.coverImage ?? "");
  // Storage path of a cover image uploaded *during this form session*
  // (not the pre-existing project.coverImage on the edit form — we never
  // learn that one's path client-side, and must never delete it just for
  // being replaced in the UI before Save is pressed; the server does that
  // itself, safely, after the save actually succeeds — see
  // app/api/projects/[slug]/route.ts). Used only to clean up an upload
  // that gets swapped out or abandoned before saving (brief, point 6).
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState<ProjectVisibility>(project?.visibility ?? "PUBLIC");
  // Phase 6.2 — Project Showcase.
  const [shortDescription, setShortDescription] = useState(project?.shortDescription ?? "");
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl ?? "");
  const [externalUrl, setExternalUrl] = useState(project?.externalUrl ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  // Phase 6.4 — Project Creation Flow. Create-mode only; edit mode still
  // manages its gallery entirely through ProjectGalleryEditor on the
  // edit page, unchanged.
  const [galleryItems, setGalleryItems] = useState<StagedGalleryItem[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  // Kept in sync on every render (not just inside the effect) so the
  // unmount cleanup below always revokes whatever was staged most
  // recently, not whatever existed when the effect first ran.
  const galleryItemsRef = useRef(galleryItems);
  galleryItemsRef.current = galleryItems;

  useEffect(() => {
    return () => {
      galleryItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  function handleGalleryFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setGalleryItems((current) => {
      const room = MAX_GALLERY_IMAGES - current.length;
      if (room <= 0) return current;
      const accepted = files.slice(0, room).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...current, ...accepted];
    });
  }

  function handleRemoveGalleryItem(index: number) {
    setGalleryItems((current) => {
      const item = current[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  // Best-effort: fire-and-forget per the brief's point 6 ("не оставлять
  // мусор в Storage"), but never something the UI blocks on — the object
  // is orphaned either way once it's no longer referenced by `path`.
  function discardOrphanUpload(path: string) {
    fetch("/api/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch((err) => {
      console.error("[project-form] failed to discard orphaned upload:", err);
    });
  }

  async function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Always clear the input value so picking the exact same file again
    // still fires a change event.
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

      setCoverImage(data.url);
      setUploadedPath(data.path);

      // Brief, point 6 — a previous *unsaved* upload from this same
      // session is now orphaned by the replacement; the pre-existing
      // project.coverImage on the edit form is never touched here (see
      // uploadedPath's own comment above).
      if (previousUploadedPath) {
        discardOrphanUpload(previousUploadedPath);
      }
    } catch (err) {
      console.error("[project-form] cover upload failed:", err);
      setUploadError(true);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveCover() {
    setCoverImage("");
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

    const endpoint = mode === "create" ? "/api/projects" : `/api/projects/${project?.slug}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const payload =
      mode === "create"
        ? { title, description, coverImage, shortDescription, githubUrl, externalUrl }
        : { title, description, coverImage, visibility, shortDescription, githubUrl, externalUrl };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      const data: { project: Project } = await response.json();

      // Phase 6.4 — Project Creation Flow. The project now exists, so
      // any gallery files staged before submit can finally be uploaded —
      // same route (and same sequential-not-parallel reasoning, to keep
      // upload order == gallery order) ProjectGalleryEditor already uses
      // on the edit page.
      let gallerySucceeded = true;
      if (mode === "create" && galleryItems.length > 0) {
        setIsUploadingGallery(true);
        for (const item of galleryItems) {
          try {
            const form = new FormData();
            form.append("file", item.file);
            const uploadResponse = await fetch(`/api/projects/${data.project.slug}/images`, {
              method: "POST",
              body: form,
            });
            if (!uploadResponse.ok) {
              throw new Error(`Gallery upload failed: ${uploadResponse.status}`);
            }
          } catch (err) {
            console.error("[project-form] gallery upload failed:", err);
            gallerySucceeded = false;
          }
        }
        galleryItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setIsUploadingGallery(false);
      }

      // On create: land on the finished project's own page — the whole
      // point of this phase — unless a gallery upload failed, in which
      // case the project still exists (never rolled back) but the user
      // is sent to the edit page instead, where ProjectGalleryEditor
      // already shows exactly which images made it and lets them retry
      // the rest. Reusing that page for the failure case, rather than
      // building a separate retry UI, is the reuse this phase's brief
      // asks for. Editing an *existing* project still goes to its view
      // page either way, same as before.
      const destination =
        mode === "create"
          ? gallerySucceeded
            ? `/projects/${data.project.slug}`
            : `/projects/${data.project.slug}/edit?galleryError=1`
          : `/projects/${data.project.slug}`;
      router.push(destination);
      router.refresh();
    } catch (err) {
      console.error("[project-form] save failed:", err);
      setError(true);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={formLabelClasses}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={formFieldClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="shortDescription" className={formLabelClasses}>
          Short Description
        </label>
        <input
          id="shortDescription"
          name="shortDescription"
          type="text"
          maxLength={200}
          placeholder="Один-два речення про проєкт"
          value={shortDescription ?? ""}
          onChange={(event) => setShortDescription(event.target.value)}
          className={formFieldClasses}
        />
        <p className="font-mono text-[10px] text-ash/70">{(shortDescription ?? "").length}/200</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className={formLabelClasses}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          maxLength={4000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={cn(formFieldClasses, "resize-y leading-relaxed")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={formLabelClasses}>Cover Image</label>

        {coverImage && (
          <div className="relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-md border border-line/60 bg-graphite">
            <Image
              src={coverImage}
              alt=""
              fill
              sizes="384px"
              className="object-cover"
              unoptimized={isExternalUrl(coverImage)}
            />
            <button
              type="button"
              onClick={handleRemoveCover}
              disabled={isUploading}
              aria-label="Прибрати обкладинку"
              className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-charcoal/80 p-1.5 text-bone transition-colors duration-fast hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="coverImage"
          name="coverImage"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleCoverFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
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
              {coverImage ? "Змінити зображення" : "Завантажити зображення"}
            </>
          )}
        </button>
        {uploadError && <p className="font-mono text-[11px] text-brass">{UPLOAD_ERROR_MESSAGE}</p>}
      </div>

      {/* Phase 6.4 — Project Creation Flow. Create mode only: on the
          edit page, ProjectGalleryEditor already owns gallery management
          below this form (app/projects/[slug]/edit/page.tsx) — this
          block would just be a second, conflicting way to do the same
          thing there, so it's gated on mode instead of always rendering. */}
      {mode === "create" && (
        <div className="flex flex-col gap-2">
          <label className={formLabelClasses}>Gallery Images</label>
          <p className="font-sans text-sm text-ash/80">
            До {MAX_GALLERY_IMAGES} зображень. Завантажаться одразу після створення проєкту.
          </p>

          {galleryItems.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {galleryItems.map((item, index) => (
                <div
                  key={item.previewUrl}
                  className="relative aspect-square overflow-hidden rounded-md border border-line/60 bg-graphite"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element --
                      local blob: preview URL, never a remote/optimizable image. */}
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryItem(index)}
                    disabled={isSubmitting}
                    aria-label="Прибрати зображення"
                    className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-charcoal/80 p-1.5 text-bone transition-colors duration-fast hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={handleGalleryFilesChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isSubmitting || galleryItems.length >= MAX_GALLERY_IMAGES}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
          >
            <Upload size={14} />
            {galleryItems.length >= MAX_GALLERY_IMAGES ? "Досягнуто ліміт" : "Додати зображення"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="githubUrl" className={formLabelClasses}>
          GitHub URL
        </label>
        <input
          id="githubUrl"
          name="githubUrl"
          type="text"
          placeholder="https://github.com/…"
          value={githubUrl ?? ""}
          onChange={(event) => setGithubUrl(event.target.value)}
          className={formFieldClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="externalUrl" className={formLabelClasses}>
          Website URL
        </label>
        <input
          id="externalUrl"
          name="externalUrl"
          type="text"
          placeholder="https://…"
          value={externalUrl ?? ""}
          onChange={(event) => setExternalUrl(event.target.value)}
          className={formFieldClasses}
        />
      </div>

      {/* Visibility is only editable after creation — the brief's create
          form is Title/Description/Cover Image only; every new project
          starts PUBLIC (the schema default) and can be switched to
          PRIVATE from here once it exists. */}
      {mode === "edit" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="visibility" className={formLabelClasses}>
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as ProjectVisibility)}
            className={formFieldClasses}
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
      )}

      {error && <p className="font-mono text-xs text-brass">{SAVE_ERROR_MESSAGE}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-bone transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {isUploadingGallery ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Завантаження галереї…
            </>
          ) : mode === "create" ? (
            "Створити проєкт"
          ) : (
            "Зберегти зміни"
          )}
        </button>
      </div>
    </form>
  );
}
