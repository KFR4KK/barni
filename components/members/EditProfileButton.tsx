import Link from "next/link";

// Rendered in the owner's actions row on their own /members/[slug] page
// (see app/members/[slug]/page.tsx). Renders its own markup instead of
// the shared Button component so it can be fully pill-shaped with an
// Inter label (per Правки 3), without changing Button.tsx, which is
// still used, unchanged, by the rest of the site.
export function EditProfileButton() {
  return (
    <Link
      href="/profile/edit"
      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-sans text-sm text-bone transition-colors duration-150 hover:border-brass focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
    >
      Редагувати профіль
    </Link>
  );
}
