import Image from "next/image";
import type { ReactNode } from "react";
import type { Member } from "@/data/types";
import { formatDate, isExternalUrl } from "@/lib/utils";

interface MemberHeaderProps {
  member: Member;
  /** "City, Country" from the owning Profile (lib/profiles.ts), if set. Not
   * part of the static Member data, so it's a separate slot rather than a
   * field on `member`. */
  location?: string | null;
  /** Claim/Edit profile button, decided by the page based on session +
   * ownership. Rendered here (not by the page directly) so it sits in the
   * same header column as the rest of the identity block. */
  actions?: ReactNode;
  /** Phase 4 — Discord membership badge (+ "Join Discord" link when not a
   * member), decided by the page from the owning Profile's serverMember
   * field. Only present for claimed profiles — see app/members/[slug]/page.tsx.
   * A separate slot from `actions` since it's status, not something the
   * viewer can click to change; keeps DiscordBadge's own layout (badge +
   * optional link) independent of however many buttons `actions` renders. */
  discordBadge?: ReactNode;
  /** Phase 5.1 — Follow System: "X Followers · Y Following" + the
   * Follow/Following button, decided by the page from Follow rows keyed
   * off the owning Profile's userId. Only present for claimed profiles,
   * same reasoning as discordBadge above — an unclaimed Profile has no
   * User to follow. A separate slot rather than folding into `actions`
   * since it mixes a status display (the counts) with a control (the
   * button), unlike `actions`, which is buttons only. */
  followSection?: ReactNode;
}

export function MemberHeader({ member, location, actions, discordBadge, followSection }: MemberHeaderProps) {
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
          unoptimized={isExternalUrl(member.avatar)}
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
        {location && <p className="mt-1 font-mono text-xs text-ash">{location}</p>}
        {discordBadge && <div className="mt-3">{discordBadge}</div>}
        {followSection && <div className="mt-3">{followSection}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
