import type { Member } from "@/data/types";
import { AmbientLayer } from "@/components/members/AmbientLayer";
import { AutoAmbientBackground } from "@/components/members/AutoAmbientBackground";

interface AmbientBackgroundProps {
  member: Member;
}

// Every profile gets its own ambient tint. If the member data sets a manual
// `background` palette, that's used directly — zero client JS, fastest and
// most reliable, and the recommended path. If not, a lightweight client-side
// fallback samples the avatar itself. Either way the visual result is the
// same shared <AmbientLayer />.
export function AmbientBackground({ member }: AmbientBackgroundProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {member.background ? (
        <AmbientLayer palette={member.background} />
      ) : (
        <AutoAmbientBackground avatarSrc={member.avatar} />
      )}
    </div>
  );
}
