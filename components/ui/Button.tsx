"use client";

// Marked "use client" because it optionally accepts an onClick handler,
// which requires an interactive boundary. Every current page-level Button
// usage still passes `href` rather than `onClick` — the onClick branch
// exists so a link-or-action component doesn't need a near-duplicate
// sibling later (e.g. a mobile nav toggle).
//
// (components/members/FollowButton.tsx is a separate, purpose-built client
// component rather than a consumer of this onClick branch — it needs its
// own fetch/optimistic-update state, which doesn't fit this component's
// plain callback-prop shape. See that file's own comment.)

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "text" | "outline";
  className?: string;
}

export function Button({ href, onClick, children, variant = "text", className }: ButtonProps) {
  const classes = cn(
    "inline-flex items-center gap-2 font-sans text-sm tracking-wide transition-colors duration-150",
    variant === "text" && "text-ash hover:text-bone",
    variant === "outline" &&
      "rounded-md border border-line px-4 py-2 text-bone hover:border-brass",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
