import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { FeedSidebarCard } from "@/components/feed/FeedSidebarCard";
import { buildProfileURL, isExternalUrl } from "@/lib/utils";
import type { NewMember } from "@/lib/community-stats";

interface NewMembersCardProps {
  members: NewMember[];
  className?: string;
}

// Feed Redesign — one of the two "make the platform feel alive" right-
// column widgets (replaces the removed PopularTagsCard). Deliberately a
// tight avatar row, not a full name/handle list the way
// PopularAccountsCard is — "new members" is meant to be a glance, not a
// second directory.
export function NewMembersCard({ members, className }: NewMembersCardProps) {
  if (members.length === 0) return null;

  return (
    <FeedSidebarCard title="Нові учасники" subtitle="щойно приєднались" className={className}>
      <div className="flex flex-wrap gap-3">
        {members.map((member) => (
          <Link
            key={member.username}
            href={buildProfileURL(member.username)}
            title={member.displayName}
            className="group flex flex-col items-center gap-1.5"
          >
            <span className="relative h-11 w-11 overflow-hidden rounded-full bg-graphite ring-1 ring-line/60 transition-colors duration-fast group-hover:ring-brass/60">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.displayName}
                  fill
                  sizes="44px"
                  className="object-cover"
                  unoptimized={isExternalUrl(member.avatarUrl)}
                />
              ) : (
                <UserRound className="h-full w-full p-2 text-ash" aria-hidden="true" />
              )}
            </span>
            <span className="max-w-[52px] truncate font-sans text-[10px] text-ash">
              {member.displayName}
            </span>
          </Link>
        ))}
      </div>
    </FeedSidebarCard>
  );
}
