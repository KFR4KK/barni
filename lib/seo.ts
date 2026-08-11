import type { Metadata } from "next";
import type { Member } from "@/data/types";
import { siteConfig } from "@/data/site";

export function buildMemberMetadata(member: Member): Metadata {
  const title = member.nickname;
  const skillsText = member.skills && member.skills.length > 0 ? member.skills.join(", ") : undefined;
  const description = skillsText
    ? `${member.nickname}, ${skillsText} — учасник спільноти ${siteConfig.name}.`
    : `${member.nickname} — учасник спільноти ${siteConfig.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: member.bannerImage ? [member.bannerImage] : undefined,
    },
  };
}
