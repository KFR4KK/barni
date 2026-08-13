"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface DeleteProjectButtonProps {
  projectSlug: string;
  projectTitle: string;
}

const DELETE_ERROR_MESSAGE = "Не вдалося видалити проєкт. Спробуйте ще раз.";

// Phase 6.5 — Project Deletion.
//
// Confirmation is mandatory here (deleting a project — and every image
// in its gallery — can't be undone), so this reuses
// components/ui/Modal.tsx rather than a bare `confirm()` or a second
// dialog implementation — that component was deliberately built generic
// for exactly this ("a later phase reaching for a confirmation dialog
// ... doesn't need a second modal implementation"), and this is that
// later phase.
//
// A standalone component (not folded into ProjectForm, which is already
// Title/Description/Cover/Gallery/Visibility) since delete has nothing
// to do with the rest of that form's staged-then-submitted state — it's
// a single, immediate, irreversible action against the existing
// DELETE /api/projects/[slug] route, same route shape as every other
// per-project write in this app.
export function DeleteProjectButton({ projectSlug, projectTitle }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(false);

  async function handleConfirm() {
    if (isDeleting) return;
    setError(false);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/projects/${projectSlug}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      // The project no longer exists, so there's nowhere left on
      // /projects/[slug] to land back on — /profile is the one page
      // every signed-in user (i.e. every possible owner here) always
      // has, no extra lookup needed.
      router.push("/profile");
      router.refresh();
    } catch (err) {
      console.error("[delete-project-button] delete failed:", err);
      setError(true);
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:border-brass hover:text-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        <Trash2 size={14} />
        Видалити проєкт
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isDeleting) setIsOpen(false);
        }}
        title="Видалити проєкт?"
      >
        <div className="flex flex-col gap-5">
          <p className="font-sans text-sm leading-relaxed text-ash">
            Проєкт «{projectTitle}» та всі зображення його галереї буде видалено назавжди. Цю дію
            неможливо скасувати.
          </p>

          {error && <p className="font-sans text-xs text-brass">{DELETE_ERROR_MESSAGE}</p>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
              className="font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:text-bone disabled:opacity-60"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-md border border-brass px-4 py-2 font-sans text-xs uppercase tracking-wider text-brass transition-colors duration-fast hover:bg-brass hover:text-charcoal focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2 disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Видалення…
                </>
              ) : (
                "Так, видалити"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
