import { members } from "@/data/members";
import type { Member } from "@/data/types";

// Every page/component gets member data through these functions, never by
// importing `members` from `@/data/members` directly. If the storage
// mechanism ever changes (e.g. split into one file per member at scale),
// only this file needs to change.

export function getAllMembers(): Member[] {
  return members;
}

export function getMemberBySlug(slug: string): Member | undefined {
  return members.find((member) => member.slug === slug);
}

export function getAllSlugs(): string[] {
  return members.map((member) => member.slug);
}
