import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { buildProfileURL, isExternalUrl } from "@/lib/utils";

interface ViewerCardProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followersCount: number;
  postsCount: number;
  className?: string;
}

// Feed Redesign — the small "who am I" card the brief allows adding to
// the left column, above the existing PopularAccountsCard. Its own
// component, not folded into PopularAccountsCard, since the shape
// (bigger avatar, a stat row, a profile link) doesn't match that list's
// row layout at all.
export function ViewerCard({
  username,
  displayName,
  avatarUrl,
  followersCount,
  postsCount,
  className,
}: ViewerCardProps) {
  return (
    <div className={`rounded-[20px] border border-line/50 bg-charcoal/20 p-6 shadow-card ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-graphite">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized={isExternalUrl(avatarUrl)}
            />
          ) : (
            <UserRound className="h-full w-full p-2.5 text-ash" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-medium text-bone">{displayName}</p>
          <p className="truncate font-sans text-xs text-ash">@{username}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5 font-sans text-xs text-ash">
        <span>
          <span className="font-medium text-bone">{followersCount}</span> підписників
        </span>
        <span>
          <span className="font-medium text-bone">{postsCount}</span> постів
        </span>
      </div>

      <Link
        href={buildProfileURL(username)}
        className="mt-4 block rounded-full border border-line px-4 py-2 text-center font-sans text-xs text-bone transition-colors duration-fast hover:border-brass hover:text-brass"
      >
        Перейти в профіль
      </Link>
    </div>
  );
}
