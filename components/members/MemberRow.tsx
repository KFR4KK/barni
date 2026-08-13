import Image from "next/image";
import Link from "next/link";
import type { Member } from "@/data/types";
import { buildProfileURL, isExternalUrl } from "@/lib/utils";

interface MemberRowProps {
  member: Member;
  index: number;
}

export function MemberRow({ member, index }: MemberRowProps) {
  return (
    <Link
      href={buildProfileURL(member.slug)}
      className="group relative flex items-center justify-between gap-6 border-b border-line/60 py-7 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass focus-visible:outline-offset-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-6">
          <span className="font-sans text-xs text-ash">{String(index + 1).padStart(2, "0")}</span>
          <span className="truncate font-serif text-2xl text-bone">{member.nickname}</span>
        </div>
        {member.skills && member.skills.length > 0 && (
          <span className="pl-[2.75rem] font-sans text-xs uppercase tracking-wider text-ash">
            {member.skills.join(" · ")}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="relative hidden h-14 w-14 overflow-hidden rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
          <Image
            src={member.avatar}
            alt={member.avatarAlt}
            fill
            sizes="56px"
            className="object-cover"
            unoptimized={isExternalUrl(member.avatar)}
          />
        </div>
        <span
          aria-hidden="true"
          className="font-sans text-ash transition-transform duration-150 group-hover:translate-x-1 group-hover:text-brass"
        >
          →
        </span>
      </div>

      <span className="absolute bottom-0 left-0 h-px w-0 bg-brass transition-all duration-200 group-hover:w-full" />
    </Link>
  );
}
