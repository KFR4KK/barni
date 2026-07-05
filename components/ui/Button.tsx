"use client";

// This is the only client component in the current build. It's marked
// "use client" because it optionally accepts an onClick handler, which
// requires an interactive boundary. Nothing in the current pages uses that
// branch yet (every current Button usage passes `href`), but keeping one
// component that supports both link and action variants avoids having two
// near-identical components later (e.g. for a mobile nav toggle).

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
    "inline-flex items-center gap-2 font-mono text-sm tracking-wide transition-colors duration-150",
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
