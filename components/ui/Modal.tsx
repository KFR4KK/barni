"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Phase 5.2 — the project has no Dialog/Modal component yet (checked
// before adding this), so per that phase's brief this is the "minimal
// solution that doesn't change the architecture": the native <dialog>
// element rather than a new UI-library dependency. `showModal()` already
// gives focus trapping, Escape-to-close, and a real ::backdrop (styled in
// app/globals.css using the same --color-graphite token as everywhere
// else) for free — there's no real gap left for a library to fill here.
//
// Generic and content-agnostic on purpose: components/members/FollowListModal.tsx
// is the only current caller, but nothing about this component is
// Follow-specific, so a later phase reaching for a confirmation dialog or
// similar doesn't need a second modal implementation.
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // A click that lands on the <dialog> element itself (not any of
        // its children) is a click on the backdrop — the standard
        // click-outside-to-close technique for the native element.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      className="w-full max-w-md rounded-card border border-line bg-charcoal p-0 text-bone shadow-card"
      aria-labelledby="modal-title"
    >
      <div className="flex items-center justify-between border-b border-line/60 px-6 py-4">
        <h2 id="modal-title" className="font-serif text-lg text-bone">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="font-sans text-ash transition-colors duration-fast hover:text-bone focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
    </dialog>
  );
}
