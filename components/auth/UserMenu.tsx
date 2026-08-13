"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

// The only client component this phase adds beyond the existing Button.
// Needs "use client" purely for the open/close dropdown state — the
// sign-out action inside it is still a plain Server Action, not a fetch
// call, so there's no custom auth logic running in the browser.
export function UserMenu({ username, displayName, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = displayName ?? username ?? "…";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-fast hover:bg-charcoal focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-2"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={label}
            width={28}
            height={28}
            className="rounded-full border border-line"
          />
        ) : (
          <UserRound className="h-6 w-6 text-ash" aria-hidden="true" />
        )}
        <span className="hidden font-sans text-xs uppercase tracking-wider text-bone sm:inline">
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-ash transition-transform duration-fast",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-card border border-line bg-charcoal shadow-card"
        >
          <div className="border-b border-line/60 px-4 py-3">
            <p className="font-sans text-[10px] uppercase tracking-wider text-ash">Увійшли як</p>
            <p className="truncate font-sans text-sm text-bone">{label}</p>
          </div>

          {/*
            /profile is a redirect, not a page of its own — it looks up
            the signed-in user's own Profile (always exists, see
            lib/auth.ts's `createUser` event) and sends them straight to
            /members/[slug]. See app/profile/page.tsx.
          */}
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
          >
            Профіль
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
          >
            Налаштування
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans text-xs uppercase tracking-wider text-ash transition-colors duration-fast hover:bg-graphite hover:text-bone"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Вийти
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
