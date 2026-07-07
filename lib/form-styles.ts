import { cn } from "@/lib/utils";

// Originally defined inline in app/profile/edit/page.tsx (Phase 3's edit
// form) — factored out here so Phase 6.1's project create/edit forms
// (components/projects/ProjectForm.tsx) reuse the exact same input/label
// treatment instead of copy-pasting the class strings a second time.
// Still the same reasoning as before: no input/textarea/select existed
// anywhere in the app prior to Phase 3, so this stays close to the
// existing Button component's border/focus language (border-line, brass
// focus ring) rather than introducing a new visual style.

export const formFieldClasses = cn(
  "w-full rounded-md border border-line bg-charcoal/40 px-4 py-2.5 font-sans text-sm text-bone",
  "placeholder:text-ash/60",
  "transition-colors duration-fast focus:border-brass focus:outline-none",
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
);

export const formLabelClasses = "font-mono text-xs uppercase tracking-wider text-ash";
