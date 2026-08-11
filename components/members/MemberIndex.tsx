import type { Member } from "@/data/types";
import { MemberRow } from "@/components/members/MemberRow";

interface MemberIndexProps {
  members: Member[];
}

// Deliberately a plain, undecorated list — no data fetching of its own, so
// it stays trivial to test and to reuse (e.g. from a future /members route
// with search/filtering applied before the array reaches this component).
export function MemberIndex({ members }: MemberIndexProps) {
  return (
    <div>
      {members.map((member, index) => (
        <MemberRow key={member.slug} member={member} index={index} />
      ))}
    </div>
  );
}
