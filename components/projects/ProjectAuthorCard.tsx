import Image from "next/image";
import Link from "next/link";
import { Cake, Clock3, BadgeCheck, UserRound } from "lucide-react";
import type { Socials } from "@/data/types";
import { socialIcons, socialLabels, socialOrder } from "@/lib/social-icons";
import { formatRelativeTime, formatPlatformTenure, isExternalUrl, cn } from "@/lib/utils";

interface ProjectAuthorCardProps {
  authorName: string;
  authorUsername: string;
  authorHref: string | null;
  avatarUrl: string | null;
  isDiscordMember: boolean;
  bio: string;
  socials: Socials | undefined;
  /** Author's first sign-in — see lib/utils.ts's formatPlatformTenure. */
  memberSince: Date;
  /** When this project was published — shown compactly under the name,
   * same relative-time convention as CommentItem/PostCard use elsewhere
   * in the app. */
  postedAt: Date;
  className?: string;
}

// Phase 10 — Project page redesign. Age has no real data source yet —
// Profile doesn't store a birthdate (see that model's own comment in
// prisma/schema.prisma) — so per the brief this stays a plain, hardcoded
// placeholder rather than being computed from anything, until a future
// profile-redesign phase adds a real field to derive it from.
const PLACEHOLDER_AGE = 16;

export function ProjectAuthorCard({
  authorName,
  authorUsername,
  authorHref,
  avatarUrl,
  isDiscordMember,
  bio,
  socials,
  memberSince,
  postedAt,
  className,
}: ProjectAuthorCardProps) {
  const activeSocials = socialOrder.filter((platform) => socials?.[platform]);

  return (
    <aside
      className={cn(
        "flex flex-col gap-6 rounded-[20px] border border-line/50 bg-charcoal/20 p-6",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line/60 bg-graphite">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={authorName}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized={isExternalUrl(avatarUrl)}
            />
          ) : (
            <UserRound className="h-full w-full p-2.5 text-ash" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {authorHref ? (
              <Link
                href={authorHref}
                className="truncate font-display text-sm font-medium text-bone transition-colors duration-fast hover:text-brass"
              >
                {authorName}
              </Link>
            ) : (
              <span className="truncate font-display text-sm font-medium text-bone">{authorName}</span>
            )}
            {isDiscordMember && (
              <BadgeCheck
                size={15}
                className="shrink-0 text-sky-400"
                aria-label="Учасник Discord серверу"
              />
            )}
          </div>
          <p className="truncate font-mono text-xs text-ash">@{authorUsername}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ash/60">{formatRelativeTime(postedAt)}</p>
        </div>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-ash">Автор</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          <li className="flex items-center gap-2 font-sans text-sm text-bone/90">
            <Cake size={14} className="shrink-0 text-ash" aria-hidden="true" />
            вік: {PLACEHOLDER_AGE} років
          </li>
          <li className="flex items-center gap-2 font-sans text-sm text-bone/90">
            <Clock3 size={14} className="shrink-0 text-ash" aria-hidden="true" />
            на платформі: {formatPlatformTenure(memberSince)}
          </li>
        </ul>
      </div>

      {bio && <p className="font-sans text-sm leading-relaxed text-ash">{bio}</p>}

      {activeSocials.length > 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ash">Контакти</p>
          <ul className="mt-3 flex flex-col gap-2">
            {activeSocials.map((platform) => {
              const Icon = socialIcons[platform];
              const url = socials?.[platform];
              if (!url) return null;
              return (
                <li key={platform}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${socialLabels[platform]} (відкриється у новій вкладці)`}
                    className="inline-flex w-full items-center gap-2 rounded-md border border-line/60 px-3 py-2 font-sans text-sm text-bone/90 transition-colors duration-fast hover:border-brass/50 hover:text-bone"
                  >
                    <Icon size={14} className="shrink-0 text-ash" aria-hidden="true" />
                    {socialLabels[platform]}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
