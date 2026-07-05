import Image from "next/image";
import type { Member } from "@/data/types";
import { formatDate } from "@/lib/utils";

interface MemberHeaderProps {
  member: Member;
}

export function MemberHeader({ member }: MemberHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-40 w-40 overflow-hidden rounded-2xl md:h-48 md:w-48">
        <Image
          src={member.avatar}
          alt={member.avatarAlt}
          fill
          sizes="192px"
          className="object-cover"
          priority
        />
      </div>
      <div>
        <h1 className="font-serif text-4xl text-bone md:text-5xl">{member.nickname}</h1>
        {member.realName && (
          <p className="mt-1.5 font-sans text-sm text-ash/70">({member.realName})</p>
        )}
        {member.skills && member.skills.length > 0 && (
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-brass">
            {member.skills.join(" · ")}
          </p>
        )}
        <p className="mt-2 font-mono text-xs text-ash">Приєднався {formatDate(member.joinedDate)}</p>
      </div>
    </div>
  );
}
