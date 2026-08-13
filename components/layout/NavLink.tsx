"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "font-sans text-xs uppercase tracking-wider transition-colors duration-150",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2",
        isActive ? "text-bone" : "text-ash hover:text-bone"
      )}
    >
      {label}
    </Link>
  );
}
