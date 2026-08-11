import { Trophy, Award, Star, Sparkles, Crown, Medal, type LucideIcon } from "lucide-react";

// The supported set of award icons. Keep this small and curated rather than
// exposing every Lucide icon — awards should read as an intentional,
// handcrafted set, not an open-ended icon picker.
const awardIcons: Record<string, LucideIcon> = {
  Trophy,
  Award,
  Star,
  Sparkles,
  Crown,
  Medal,
};

export function getAwardIcon(name: string): LucideIcon {
  return awardIcons[name] ?? Award;
}
